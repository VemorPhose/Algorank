const express = require("express");
const router = express.Router();
const Submission = require("../models/submission");
const Problem = require("../models/problem");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { isFloat32Array } = require("util/types");
const pool = require("../config/db");

const JUDGE0_BASE_URL = "https://ce.judge0.com";
const SUBMISSION_CHECK_INTERVAL = 1000; // 1 second
const MAX_CHECK_ATTEMPTS = 10;

// Add base64 encoding helper function at the top
function encodeBase64(str) {
  return Buffer.from(str).toString('base64');
}

// Helper function to wait for Judge0 submission batch results
async function waitForBatchResults(tokens) {
  let attempts = 0;
  while (attempts < MAX_CHECK_ATTEMPTS) {
    try {
      const response = await axios.get(
        `${JUDGE0_BASE_URL}/submissions/batch`,
        {
          params: {
            tokens: tokens.join(','),
            base64_encoded: true,
            fields: 'token,status,time,memory,stderr,compile_output,message'
          }
        }
      );

      if (response.data.submissions.every(sub => 
        sub.status.id !== 1 && sub.status.id !== 2)) {
        return response.data.submissions;
      }

      await new Promise(resolve => setTimeout(resolve, SUBMISSION_CHECK_INTERVAL));
      attempts++;
    } catch (error) {
      console.error("Error checking batch status:", error);
      throw error;
    }
  }
  throw new Error("Batch submission timeout");
}

// Update the main route handler
router.post("/", async (req, res) => {
  const { problemId, userId, submissionId, code, language, contestId } = req.body;

  if (!problemId || !userId || !code || !language) {
    console.log("Missing fields:", { problemId, userId, code, language });
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    console.log("Received submission:", { problemId, userId, submissionId, language, contestId });
    // Create submission record with contestId
    await Submission.create({
      submissionId,
      problemId,
      userId,
      code,
      language,
      contestId
    });

    // Verify test cases directory exists
    const testCasesDir = path.join(
      __dirname, 
      '..', 
      '..', 
      'algorank-problems',
      'problems',
      problemId,
      'testcases'
    );
    const inputsDir = path.join(testCasesDir, "inputs");

    try {
      await fs.access(inputsDir);
    } catch (error) {
      throw new Error(`Test cases directory not found: ${inputsDir}`);
    }

    const inputFiles = await fs.readdir(inputsDir);
    if (inputFiles.length === 0) {
      throw new Error("No test cases found");
    }

    // Update the submissions array creation
    const submissions = await Promise.all(
      inputFiles.map(async (inputFile) => {
        const testCaseNumber = parseInt(inputFile.replace("input", "").replace(".txt", ""));
        const [input, expectedOutput] = await Promise.all([
          fs.readFile(path.join(inputsDir, `input${testCaseNumber}.txt`), "utf8"),
          fs.readFile(path.join(testCasesDir, "outputs", `output${testCaseNumber}.txt`), "utf8")
        ]);

        return {
          language_id: getLanguageId(language),
          source_code: encodeBase64(code),
          stdin: encodeBase64(input.trim()),
          expected_output: encodeBase64(expectedOutput.trim()),
          cpu_time_limit: 2,
          memory_limit: 128000
        };
      })
    );

    // Update batch submission request
    const batchResponse = await axios.post(
      `${JUDGE0_BASE_URL}/submissions/batch`,
      { submissions },
      {
        params: { base64_encoded: true },
        headers: { "Content-Type": "application/json" }
      }
    ).catch(error => {
      console.error("Judge0 API Error:", error.response?.data || error.message);
      throw error;
    });

    const tokens = batchResponse.data.map(sub => sub.token);
    const results = await waitForBatchResults(tokens);

    // Process results
    const processedResults = await Promise.all(results.map(async (result, index) => {
      const status = result.status.id === 3;
      const executionTime = Math.round(parseFloat(result.time || "0") * 1000);
      const memoryUsed = result.memory || 0;

      // Save individual test results
      await Submission.saveTestResult(
        submissionId,
        index + 1,
        status,
        executionTime,
        memoryUsed
      );

      return {
        number: index + 1,
        passed: status,
        executionTime,
        memoryUsed,
        verdict: result.status.description
      };
    }));

    const finalStatus = processedResults.every(r => r.passed);
    await Submission.updateStatus(submissionId, finalStatus);

    // Update solved status if all passed
    if (finalStatus) {
      const solved_count = await pool.query(
        'SELECT COUNT(*) FROM solved WHERE problem_id = $1 AND user_id = $2',
        [problemId, userId]
      );
      
      if (solved_count.rows[0].count === '0') {
        await Problem.incrementSolvedCount(problemId);
        await pool.query(
          `INSERT INTO solved (problem_id, user_id) 
           VALUES ($1, $2) 
           ON CONFLICT (problem_id, user_id) DO NOTHING`,
          [problemId, userId]
        );
      }
    }

    // If submission successful and part of a contest, update contest score
    if (finalStatus && contestId) {
      await pool.query(
        `UPDATE contest_participants 
         SET total_score = (
           SELECT COALESCE(SUM(cp.points), 0)
           FROM contest_problems cp
           JOIN submissions s ON cp.problem_id = s.problem_id
           WHERE cp.contest_id = $1 
           AND s.user_id = $2 
           AND s.contest_id = $1
           AND s.status = true
         )
         WHERE contest_id = $1 AND user_id = $2`,
        [contestId, userId]
      );
    }

    res.json({
      status: finalStatus,
      submissionId,
      testCasesPassed: processedResults.filter(r => r.passed).length,
      totalTestCases: processedResults.length,
      testCases: processedResults
    });

  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ 
      error: "Submission failed", 
      details: error.message 
    });
  }
});

function getLanguageId(language) {
  // Updated language IDs based on Judge0 CE
  const languages = {
    cpp: 54, // C++ (GCC 9.2.0)
    python: 71, // Python (3.8.1)
    java: 62, // Java (OpenJDK 13.0.1)
  };
  return languages[language] || 54;
}

module.exports = router;
