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
    await Submission.create({ submissionId, problemId, userId, code, language });

    const testCasesDir = path.join(__dirname, '..', 'testcases', problemId);
    const inputsDir = path.join(testCasesDir, 'inputs');
    
    try {
      await fs.access(inputsDir);
    } catch (error) {
      throw new Error(`Test cases directory not found: ${inputsDir}`);
    }

    const inputFiles = await fs.readdir(inputsDir);
    
    if (inputFiles.length === 0) {
      throw new Error('No test cases found');
    }

    const results = await Promise.all(inputFiles.map(async (inputFile) => {
      const testCaseNumber = parseInt(inputFile.replace('input', '').replace('.txt', ''));
      const inputPath = path.join(inputsDir, `input${testCaseNumber}.txt`);
      const outputPath = path.join(testCasesDir, 'outputs', `output${testCaseNumber}.txt`);

      try {
        const [input, expectedOutput] = await Promise.all([
          fs.readFile(inputPath, 'utf8'),
          fs.readFile(outputPath, 'utf8')
        ]);

        const judgeResult = await axios.post('http://localhost:2358/submissions', {
          source_code: code,
          language_id: getLanguageId(language),
          stdin: input.trim(),
          expected_output: expectedOutput.trim()
        }, {
          timeout: 10000
        });

        const status = judgeResult.data.status.id === 3;
        await Submission.saveTestResult(
          submissionId,
          testCaseNumber,
          status,
          judgeResult.data.time || 0,
          judgeResult.data.memory || 0
        );

        return status;
      } catch (error) {
        console.error(`Test case ${testCaseNumber} error:`, error.message);
        if (error.code === 'ENOENT') {
          throw new Error(`Test case file not found: ${error.path}`);
        }
        return false;
      }
    }));

    const finalStatus = results.every(r => r === true);
    await Submission.updateStatus(submissionId, finalStatus);

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
      details: error.message,
      path: error.path
    });
  }
});

function getLanguageId(language) {
  const languages = {
    cpp: 54,
    python: 71,
    java: 62
  };
  return languages[language] || 54;
}

module.exports = router;