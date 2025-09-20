const express = require('express');
const multer = require('multer');
const {
  createWorkout,
  getWorkouts,
  getWorkout,
  deleteWorkout,
  updateWorkout,
  getAllWorkoutsForAdmin,
  getWorkoutCertificate,
} = require('../controllers/workoutController');
const requireAuth = require('../middleware/requireAuth');

// Configure Multer for file uploads (using memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Require auth for all workout routes
router.use(requireAuth);

// GET all workouts
router.get('/', getWorkouts);

// GET certificate bytes for a workout (must be before generic ':id' route)
router.get('/:id/certificate', getWorkoutCertificate);

// GET a single workout
router.get('/:id', getWorkout);

// POST a new workout with certificate upload
router.post('/', upload.single('certificate'), createWorkout);

// DELETE a workout
router.delete('/:id', deleteWorkout);

// UPDATE a workout with certificate upload
router.patch('/:id', upload.single('certificate'), updateWorkout);

// GET all workouts for admin
router.get('/admin/all', getAllWorkoutsForAdmin);

module.exports = router;
