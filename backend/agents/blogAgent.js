const Groq = require('groq-sdk');
const cron = require('node-cron');
const Blog = require('../models/Blog');

const GROQ_MODEL = 'llama-3.1-8b-instant';

const CATEGORIES = [
  { name: 'Artificial Intelligence', emoji: '🧠' },
  { name: 'ERP Systems', emoji: '⚙️' },
  { name: 'CRM', emoji: '📊' },
  { name: 'LMS', emoji: '🎓' },
  { name: 'Web Development', emoji: '🌐' },
  { name: 'SEO', emoji: '🔍' },
  { name: 'Company', emoji: '🚀' },
  { name: 'Security', emoji: '🔐' }
];

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) + '-' + Date.now();
}

async function generateBlog() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const today = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const prompt = `You are a tech blogger for Elyra AI Solutions, an enterprise AI software company.
Write a professional blog post about "${cat.name}" relevant to AI and enterprise software in ${today}.

Return ONLY valid JSON, no extra text, no markdown fences:
{"title":"Engaging blog title here","excerpt":"One compelling sentence summary under 180 chars","content":"Full blog post minimum 400 words","readTime":"X min read"}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1500
  });

  const raw = completion.choices[0].message.content.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const jsonStr = raw.slice(start, end + 1).replace(/[\x00-\x1F\x7F]/g, c => {
    if (c === '\n') return '\\n';
    if (c === '\r') return '\\r';
    if (c === '\t') return '\\t';
    return '';
  });
  const data = JSON.parse(jsonStr);

  const blog = await Blog.create({
    title: data.title,
    slug: slugify(data.title),
    category: cat.name,
    emoji: cat.emoji,
    excerpt: data.excerpt,
    content: data.content,
    readTime: data.readTime || '5 min read',
    status: 'published',
    publishedAt: new Date(),
    aiGenerated: true
  });

  console.log(`[BlogAgent] Published: "${blog.title}"`);
  return blog;
}

function startBlogScheduler() {
  cron.schedule('0 18 * * *', async () => {
    console.log('[BlogAgent] Running scheduled blog generation...');
    try { await generateBlog(); }
    catch (err) { console.error('[BlogAgent] Error:', err.message); }
  });
  console.log('[BlogAgent] Scheduler active — posts daily at 6 PM');
}

module.exports = { generateBlog, startBlogScheduler };
