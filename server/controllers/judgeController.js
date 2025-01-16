const axios = require('axios');
const fs = require('fs');
const path = require('path');

const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com/submissions';
const API_KEY = process.env.JUDGE0_API_KEY;

const languageMapping = {
  'cpp': 54,
  'c': 50,
  'python': 71,
  'java': 62
};

async function evaluateCode(language, filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const languageId = languageMapping[language];

  const options = {
    method: 'POST',
    url: JUDGE0_API,
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    },
    data: {
      language_id: languageId,
      source_code: sourceCode,
      stdin: '',
      expected_output: '',
    }
  };

  const submission = await axios.request(options);
  const token = submission.data.token;

  // Check result after submission
  const result = await checkSubmission(token);
  return result;
}

async function checkSubmission(token) {
  const options = {
    method: 'GET',
    url: `${JUDGE0_API}/${token}`,
    headers: {
      'X-RapidAPI-Key': API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    }
  };

  let status;
  do {
    const response = await axios.request(options);
    status = response.data.status.description;
    if (status !== 'Processing') return response.data;
  } while (status === 'Processing');
}

module.exports = { evaluateCode };
