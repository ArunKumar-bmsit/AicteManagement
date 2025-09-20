import { useState, useRef } from 'react';
import { useWorkoutsContext } from '../hooks/useWorkoutsContext';
import { useAuthContext } from '../hooks/useAuthContext';

const WorkoutForm = () => {
  const { dispatch } = useWorkoutsContext();
  const { user } = useAuthContext();

  const [title, setTitle] = useState('');
  const [points, setPoints] = useState('');
  const [certificate, setCertificate] = useState(null); // File state
  const [error, setError] = useState(null);
  const [emptyFields, setEmptyFields] = useState([]);

  const fileInputRef = useRef(); // Ref for the file input

  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setCertificate(null);
      return;
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: PDF, JPG, JPEG, PNG');
      setCertificate(null);
      // reset the input so same file can be re-selected after change
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError('File too large. Max 10 MB allowed.');
      setCertificate(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    setCertificate(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in');
      return;
    }

    // Client-side validation mirror
    if (!title || !points || !certificate) {
      const missing = [];
      if (!title) missing.push('title');
      if (!points) missing.push('points');
      if (!certificate) missing.push('certificate');
      setEmptyFields(missing);
      setError('Please fill in all the fields');
      return;
    }

    if (certificate && (!ALLOWED_TYPES.includes(certificate.type) || certificate.size > MAX_SIZE_BYTES)) {
      setError('Invalid certificate. Check file type and size.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('points', points);
    if (certificate) {
      formData.append('certificate', certificate);
    }

    const response = await fetch('/api/workouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      body: formData, // Send the form data
    });

    const json = await response.json();

    if (!response.ok) {
      setError(json.error);
      setEmptyFields(json.emptyFields || []);
    }

    if (response.ok) {
      setTitle('');
      setPoints('');
      setCertificate(null);
      fileInputRef.current.value = ''; // Reset the file input
      setError(null);
      setEmptyFields([]);
      dispatch({ type: 'CREATE_WORKOUT', payload: json });
    }
  };

  return (
    <form className="create" onSubmit={handleSubmit}>
      <h3>Add a New Workout</h3>

      <label>Activity Title:</label>
      <input
        type="text"
        onChange={(e) => setTitle(e.target.value)}
        value={title}
        className={emptyFields.includes('title') ? 'error' : ''}
      />

      <label>Activity Points:</label>
      <input
        type="number"
        onChange={(e) => setPoints(e.target.value)}
        value={points}
        className={emptyFields.includes('points') ? 'error' : ''}
      />

      <label>Upload Certificate:</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        ref={fileInputRef} // Attach the ref
      />
      {certificate && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Selected: {certificate.name} ({Math.round(certificate.size / 1024)} KB)
        </div>
      )}

      <button>Add Workout</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};

export default WorkoutForm;
