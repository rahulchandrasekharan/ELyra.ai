const router = require('express').Router();
const Blog = require('../models/Blog');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { protect } = require('../middleware/auth');

// All admin routes require auth
router.use(protect);

// GET /api/admin/stats — dashboard overview
router.get('/stats', async (req, res) => {
  const [
    totalBlogs, publishedBlogs, aiBlogs,
    totalJobs, openJobs,
    totalApps, pendingApps, matchedApps, shortlisted
  ] = await Promise.all([
    Blog.countDocuments(),
    Blog.countDocuments({ status: 'published' }),
    Blog.countDocuments({ aiGenerated: true }),
    Job.countDocuments(),
    Job.countDocuments({ status: 'open' }),
    Application.countDocuments(),
    Application.countDocuments({ status: 'pending' }),
    Application.countDocuments({ aiMatched: true }),
    Application.countDocuments({ status: 'shortlisted' })
  ]);

  // Recent activity
  const recentApps = await Application.find()
    .sort({ createdAt: -1 }).limit(5)
    .select('name jobTitle aiScore aiMatched status createdAt');

  const recentBlogs = await Blog.find({ status: 'published' })
    .sort({ publishedAt: -1 }).limit(3)
    .select('title category publishedAt aiGenerated');

  res.json({
    blogs: { total: totalBlogs, published: publishedBlogs, aiGenerated: aiBlogs },
    jobs:  { total: totalJobs, open: openJobs },
    applications: { total: totalApps, pending: pendingApps, matched: matchedApps, shortlisted },
    recentApps,
    recentBlogs
  });
});

module.exports = router;
