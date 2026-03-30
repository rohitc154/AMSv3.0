const axios = require('axios');
const FormData = require('form-data');

const baseURL = () => process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

async function encodeFaces(imageBuffers, filenames) {
  const form = new FormData();
  imageBuffers.forEach((buf, i) => {
    form.append('images', buf, { filename: filenames[i] || `frame_${i}.jpg` });
  });

  const { data } = await axios.post(`${baseURL()}/encode-face`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });
  return data;
}

async function recognizeFace(imageBuffer, filename, knownEmbeddings) {
  const form = new FormData();
  form.append('image', imageBuffer, { filename: filename || 'capture.jpg' });
  form.append('known_embeddings', JSON.stringify(knownEmbeddings));

  const { data } = await axios.post(`${baseURL()}/recognize-face`, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000,
  });
  return data;
}

module.exports = { encodeFaces, recognizeFace };
