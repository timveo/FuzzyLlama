/**
 * Task Routes
 *
 * RESTful API endpoints for task management.
 * All routes require authentication.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All task routes require authentication
router.use(authenticate);

/**
 * Validation Schemas
 */
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  completed: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/tasks
 * List all tasks for the authenticated user
 *
 * Query params:
 * - status: 'all' | 'active' | 'completed'
 */
router.get('/', async (req, res, next) => {
  try {
    const { status = 'all' } = req.query;

    const where: any = { userId: req.user!.id };

    if (status === 'active') {
      where.completed = false;
    } else if (status === 'completed') {
      where.completed = true;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        completed: true,
        dueDate: true,
        createdAt: true,
      },
    });

    // Get counts for filter badges
    const counts = await prisma.task.groupBy({
      by: ['completed'],
      where: { userId: req.user!.id },
      _count: true,
    });

    const meta = {
      total: counts.reduce((sum, c) => sum + c._count, 0),
      active: counts.find(c => !c.completed)?._count || 0,
      completed: counts.find(c => c.completed)?._count || 0,
      filter: status,
    };

    res.json({ success: true, data: tasks, meta });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', validate(CreateTaskSchema), async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;

    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        completed: true,
        dueDate: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific task
 */
router.get('/:id', async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
router.patch('/:id', validate(UpdateTaskSchema), async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const { title, description, completed, dueDate } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(completed !== undefined && { completed }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        completed: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
