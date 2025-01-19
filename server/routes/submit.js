const express = require('express');
const router = express.Router();
const Submission = require('../models/submission');
const Problem = require('../models/problem');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

router.post('/', async (req, res) => {
  const { problemId, userId, submissionId, code, language } = req.body;

  if (!problemId || !userId || !code || !language) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create submission
    await Submission.create({ submissionId, problemId, userId, code, language });

    // Process test cases
    const testCasesDir = path.join(__dirname, '..', 'testcases', problemId);
    const inputFiles = await fs.readdir(path.join(testCasesDir, 'inputs'));
    
    const results = await Promise.all(inputFiles.map(async (inputFile) => {
      const testCaseNumber = parseInt(inputFile.replace('input', ''));
      const input = await fs.readFile(path.join(testCasesDir, 'inputs', inputFile), 'utf8');
      const expectedOutput = await fs.readFile(
        path.join(testCasesDir, 'outputs', `output${testCaseNumber}.txt`), 
        'utf8'
      );

      // Submit to Judge0
      const judgeResult = await axios.post('http://localhost:2358/submissions', {
        source_code: code,
        language_id: getLanguageId(language),
        stdin: input.trim(),
        expected_output: expectedOutput.trim()
      });

      // Save test case result
      const status = judgeResult.data.status.id === 3;
      await Submission.saveTestResult(
        submissionId,
        testCaseNumber,
        status,
        judgeResult.data.time,
        judgeResult.data.memory
      );

      return status;
    }));

    // Update final status
    const finalStatus = results.every(r => r === true);
    await Submission.updateStatus(submissionId, finalStatus);

    // Increment problem solved count if passed
    if (finalStatus) {
      await Problem.incrementSolvedCount(problemId);
    }

    res.json({
      status: finalStatus,
      submissionId,
      testCasesPassed: results.filter(r => r === true).length,
      totalTestCases: results.length
    });

  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ 
      error: 'Submission failed',
      details: error.message
    });
  }
});

function getLanguageId(language) {
  const languages = {
    cpp: 54,
    python: 71,
    java: 62
  };
  return languages[language] || 54; // default to C++
}

module.exports = router;