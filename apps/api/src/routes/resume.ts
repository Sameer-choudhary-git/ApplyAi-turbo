// apps/api/src/routes/resume.ts
import { Hono } from 'hono';
import { uploadFileToR2 } from '@applyai/utils';

const resume = new Hono();

// POST /api/resume/upload
resume.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['resume'] as File;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (file.type !== 'application/pdf') {
      return c.json({ error: 'Only PDF files are allowed' }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File must be under 5 MB' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `resumes/${timestamp}_${safeName}`;

    const url = await uploadFileToR2(buffer, fileName, file.type);

    return c.json({ url, fileName });
  } catch (err) {
    console.error('Resume upload error:', err);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

export default resume;