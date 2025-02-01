const express = require("express");
const router = express.Router();
const Submission = require("../models/submission");
const Problem = require("../models/problem");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { isFloat32Array } = require("util/types");
const pool = require("../config/db");

const JUDGE0_BASE_URL = "http://localhost:2358";
const SUBMISSION_CHECK_INTERVAL = 1000; // 1 second
const MAX_CHECK_ATTEMPTS = 10;

// Helper function to wait for Judge0 submission result
async function waitForSubmissionResult(token) {
  let attempts = 0;
  while (attempts < MAX_CHECK_ATTEMPTS) {
    try {
      const response = await axios.get(
        `${JUDGE0_BASE_URL}/submissions/${token}?base64_encoded=true`
      );

      // If the submission is finished
      if (response.data.status.id !== 1 && response.data.status.id !== 2) {
        return response.data;
      }

      // Wait before next check
      await new Promise((resolve) =>
        setTimeout(resolve, SUBMISSION_CHECK_INTERVAL)
      );
      attempts++;
    } catch (error) {
      console.error("Error checking submission status:", error);
      throw error;
    }
  }
  throw new Error("Submission timeout");
}

router.post("/", async (req, res) => {
  const { problemId, userId, submissionId, code, language } = req.body;

  if (!problemId || !userId || !code || !language) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Create submission record
    await Submission.create({
      submissionId,
      problemId,
      userId,
      code,
      language,
    });

    // Verify test cases directory exists
    const testCasesDir = path.join(__dirname, "..", "testcases", problemId);
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

    // Process each test case
    const results = await Promise.all(
      inputFiles.map(async (inputFile) => {
        const testCaseNumber = parseInt(
          inputFile.replace("input", "").replace(".txt", "")
        );
        const inputPath = path.join(inputsDir, `input${testCaseNumber}.txt`);
        const outputPath = path.join(
          testCasesDir,
          "outputs",
          `output${testCaseNumber}.txt`
        );

        try {
          const [input, expectedOutput] = await Promise.all([
            fs.readFile(inputPath, "utf8"),
            fs.readFile(outputPath, "utf8"),
          ]);

          console.log(input);
          console.log(expectedOutput);

          // Create Judge0 submission
          const submissionResponse = await axios.post(
            `${JUDGE0_BASE_URL}/submissions`,
            {
              source_code: code,
              language_id: getLanguageId(language),
              stdin: input.trim(),
              expected_output: expectedOutput.trim(),
              cpu_time_limit: 2,
              memory_limit: 128000,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          // Get submission token and wait for result
          const token = submissionResponse.data.token;
          const result = await waitForSubmissionResult(token);

          console.log(result);

          // Process result
          const status = result.status.id === 3; // 3 = Accepted
          const executionTime = Math.round(
            parseFloat(result.time || "0") * 1000
          ); // Convert to milliseconds
          const memoryUsed = result.memory || 0;

          // Save test case result
          await Submission.saveTestResult(
            submissionId,
            testCaseNumber,
            status,
            executionTime,
            memoryUsed
          );

          if (status) { // if submission was accepted
            try {
              // Check if this was first time solving
              const solved_count = await pool.query(
                'SELECT COUNT(*) FROM solved WHERE problem_id = $1 AND user_id = $2',
                [problemId, userId]
              );
              
              if (solved_count.rows[0].count === '0') {
                await Problem.incrementSolvedCount(problemId);
              }

              await pool.query(
                `INSERT INTO solved (problem_id, user_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (problem_id, user_id) DO NOTHING`,
                [problemId, userId]
              );
            } catch (error) {
              console.error('Error updating solved status:', error);
            }
          }

          return {
            number: testCaseNumber,
            passed: status,
            executionTime,
            memoryUsed,
            verdict: result.status.description
          };
        } catch (error) {
          console.error(`Test case ${testCaseNumber} error:`, error.message);
          if (error.code === "ENOENT") {
            throw new Error(`Test case file not found: ${error.path}`);
          }
          return {
            passed: false,
            executionTime: 0,
            memoryUsed: 0,
            error: error.message,
          };
        }
      })
    );

    // Calculate final results
    const finalStatus = results.every((r) => r.passed);
    await Submission.updateStatus(submissionId, finalStatus);

    // Send detailed response
    res.json({
      status: finalStatus,
      submissionId,
      testCasesPassed: results.filter((r) => r.passed).length,
      totalTestCases: results.length,
      testCases: results,
      testCaseResults: results.map((result, index) => ({
        testCase: index + 1,
        ...result,
      })),
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({
      error: "Submission failed",
      details: error.message,
      path: error.path,
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
