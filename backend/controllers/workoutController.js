const Workout = require('../models/workoutModel');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// get all workouts
const getWorkouts = async (req, res) => {
  try {
    const userId = req.user._id; // Ensure user ID is extracted from the authenticated user
    const workouts = await Workout.find({ user_id: userId }) // Filter workouts by the logged-in user's ID
      .select('-certificate.data') // Do not include large binary in list response
      .populate('user_id', 'email') // Populate user_id with the email field from User model
      .sort({ createdAt: -1 });
    console.log("Workout Response:", workouts);
    res.status(200).json(workouts);
  } catch (error) {
    console.error("Error retrieving workouts:", error); // Debugging statement
    res.status(500).json({ error: error.message });
  }
};


// get a single workout
const getWorkout = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such workout" });
  }

  try {
    const workout = await Workout.findById(id).select('-certificate.data');

    if (!workout) {
      return res.status(404).json({ error: "No such workout" });
    }

    console.log("Retrieved Workout:", workout); // Debugging statement

    res.status(200).json(workout);
  } catch (error) {
    console.error("Error retrieving workout:", error); // Debugging statement
    res.status(500).json({ error: error.message });
  }
};

const createWorkout = async (req, res) => {
  const { title, points } = req.body;
  const certificate = req.file;

  let emptyFields = [];
  if (!title) emptyFields.push("title");
  if (!points) emptyFields.push("points");
  if (!certificate) emptyFields.push("certificate");

  if (emptyFields.length > 0) {
    return res.status(400).json({ error: "Please fill in all the fields", emptyFields });
  }

  // Validate certificate format
  const allowedExtensions = /\.(pdf|jpg|jpeg|png)$/i;
  if (!allowedExtensions.test(certificate.originalname)) {
    return res.status(400).json({ error: "Invalid file format for certificate" });
  }

  try {
    const user_id = mongoose.Types.ObjectId(req.user._id); // Assume user is authenticated

    // Store the certificate file buffer and metadata directly in MongoDB
    const workout = await Workout.create({
      title,
      points,
      user_id,
      certificate: {
        data: certificate.buffer,
        filename: certificate.originalname,
        size: certificate.size,
        contentType: certificate.mimetype,
      },
    });

    res.status(200).json(workout);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// delete a workout
const deleteWorkout = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'No such workout' });
  }

  const workout = await Workout.findOneAndDelete({ _id: id });

  if (!workout) {
    return res.status(400).json({ error: 'No such workout' });
  }

  res.status(200).json(workout);
};

// update a workout
const updateWorkout = async (req, res) => {
  const { id } = req.params;
  const certificate = req.file;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such workout" });
  }

  const updates = { ...req.body };

  if (certificate) {
    const allowedExtensions = /\.(pdf|jpg|jpeg|png)$/i;
    if (!allowedExtensions.test(certificate.originalname)) {
      return res.status(400).json({ error: "Invalid file format for certificate" });
    }

    updates.certificate = {
      data: certificate.buffer,
      filename: certificate.originalname,
      size: certificate.size,
      contentType: certificate.mimetype,
    };
  }

  try {
    const workout = await Workout.findOneAndUpdate({ _id: id }, updates, { new: true });

    if (!workout) {
      return res.status(400).json({ error: "No such workout" });
    }

    console.log("Workout Updated:", workout); // Debugging statement

    res.status(200).json(workout);
  } catch (error) {
    console.error("Error updating workout:", error); // Debugging statement
    res.status(400).json({ error: error.message });
  }
};

// Get all workouts grouped by user (admin-only)
const getAllWorkoutsForAdmin = async (req, res) => {
  try {
    const workouts = await Workout.aggregate([
      {
        $group: {
          _id: "$user_id",
          totalPoints: { $sum: "$points" },
          workouts: {
            $push: {
              _id: "$_id",
              title: "$title",
              points: "$points",
              createdAt: "$createdAt",
              // Only include certificate metadata to keep payload small
              certificate: {
                filename: "$certificate.filename",
                size: "$certificate.size",
                contentType: "$certificate.contentType",
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          userDetails: { $arrayElemAt: ["$userDetails", 0] }, // Extract single object from array
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          totalPoints: 1,
          workouts: 1,
          "userDetails.name": 1,
          "userDetails.email": 1,
        },
      },
    ]);

    res.status(200).json(workouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a workout certificate
const getWorkoutCertificate = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such workout" });
  }

  try {
    const workout = await Workout.findById(id);

    if (!workout) {
      return res.status(404).json({ error: "No such workout" });
    }

    if (!workout.certificate) {
      return res.status(404).json({ error: "No certificate found for this workout" });
    }

    const certificate = workout.certificate;

    // If buffer data exists (new storage), send it
    if (certificate.data) {
      const asDownload = req.query.download === '1';
      if (asDownload) {
        res.set("Content-Disposition", `attachment; filename="${certificate.filename}"`);
      } else {
        res.set("Content-Disposition", `inline; filename="${certificate.filename}"`);
      }
      res.set("Content-Type", certificate.contentType || 'application/octet-stream');
      return res.status(200).send(certificate.data);
    }

    // Legacy fallback: if only path exists, try reading from disk
    if (certificate.path) {
      const rel = certificate.path.replace(/^\//, '');
      const absolutePath = path.join(process.cwd(), rel);
      if (fs.existsSync(absolutePath)) {
        const asDownload = req.query.download === '1';
        if (asDownload) {
          res.set("Content-Disposition", `attachment; filename="${path.basename(absolutePath)}"`);
        } else {
          res.set("Content-Disposition", `inline; filename="${path.basename(absolutePath)}"`);
        }
        res.set("Content-Type", certificate.contentType || 'application/octet-stream');
        const stream = fs.createReadStream(absolutePath);
        return stream.pipe(res);
      }
    }

    return res.status(404).json({ error: "Certificate file not found" });
  } catch (error) {
    console.error("Error retrieving workout certificate:", error); // Debugging statement
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getWorkouts,
  getWorkout,
  createWorkout,
  deleteWorkout,
  updateWorkout,
  getAllWorkoutsForAdmin, // Export function for use in routes
  getWorkoutCertificate,
};
