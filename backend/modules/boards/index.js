const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../../config/db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Create board
router.post('/', requireAuth, (req, res) => {
  const { name, description } = req.body;
  
  const boardId = nanoid();
  const board = {
    id: boardId,
    name,
    description,
    creatorId: req.user.id,
    createdAt: new Date().toISOString()
  };
  
  db.boards.set(boardId, board);
  res.json({ board });
});

// List boards
router.get('/', (req, res) => {
  const boards = Array.from(db.boards.values());
  res.json({ boards });
});

// Create thread
router.post('/:boardId/threads', requireAuth, (req, res) => {
  const { boardId } = req.params;
  const { title, content } = req.body;
  
  const threadId = nanoid();
  const thread = {
    id: threadId,
    boardId,
    title,
    content,
    authorId: req.user.id,
    authorName: req.user.displayName,
    createdAt: new Date().toISOString(),
    replyCount: 0
  };
  
  db.threads.set(threadId, thread);
  res.json({ thread });
});

// List threads in board
router.get('/:boardId/threads', (req, res) => {
  const { boardId } = req.params;
  const threads = Array.from(db.threads.values())
    .filter(t => t.boardId === boardId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ threads });
});

// Create post in thread
router.post('/threads/:threadId/posts', requireAuth, (req, res) => {
  const { threadId } = req.params;
  const { content } = req.body;
  
  const postId = nanoid();
  const post = {
    id: postId,
    threadId,
    content,
    authorId: req.user.id,
    authorName: req.user.displayName,
    createdAt: new Date().toISOString()
  };
  
  db.posts.set(postId, post);
  
  // Update thread reply count
  const thread = db.threads.get(threadId);
  if (thread) {
    thread.replyCount++;
  }
  
  res.json({ post });
});

// Get posts in thread
router.get('/threads/:threadId/posts', (req, res) => {
  const { threadId } = req.params;
  const posts = Array.from(db.posts.values())
    .filter(p => p.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  res.json({ posts });
});

module.exports = { router };
