import { useState, useEffect } from "react";
import { useWorkoutsContext } from "../hooks/useWorkoutsContext";
import { useAuthContext } from "../hooks/useAuthContext";

// date-fns
import formatDistanceToNow from "date-fns/formatDistanceToNow";

const WorkoutDetails = ({ workout }) => {
  const { dispatch } = useWorkoutsContext();
  const { user } = useAuthContext();
  const [showPreview, setShowPreview] = useState(false); // Toggle state for certificate preview
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null); // mime type
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const handleClick = async () => {
    if (!user) {
      return;
    }

    const response = await fetch("/api/workouts/" + workout._id, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });
    const json = await response.json();

    if (response.ok) {
      dispatch({ type: "DELETE_WORKOUT", payload: json });
    }
  };

  // Fetch and prepare preview securely via authenticated request
  useEffect(() => {
    let revoked = false;
    const loadPreview = async () => {
      if (!showPreview) return;
      if (!user) return;
      if (!workout || !workout._id) return;
      setPreviewError(null);
      setLoadingPreview(true);
      try {
        const resp = await fetch(`/api/workouts/${workout._id}/certificate`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!resp.ok) {
          const msg = `Failed to load certificate (${resp.status})`;
          setPreviewError(msg);
          setLoadingPreview(false);
          return;
        }
        const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        if (!revoked) {
          // Cleanup previous url if any
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(url);
          setPreviewType(contentType);
        }
      } catch (e) {
        setPreviewError('Error loading certificate');
      } finally {
        if (!revoked) setLoadingPreview(false);
      }
    };
    loadPreview();
    return () => {
      revoked = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, workout?._id, user?.token]);

  const renderCertificatePreview = () => {
    if (!workout.certificate) {
      return <p>No certificate available.</p>;
    }
    if (loadingPreview) return <p>Loading certificate...</p>;
    if (previewError) return <p style={{ color: 'red' }}>{previewError}</p>;
    if (!previewUrl) return null;

    if (previewType && previewType.startsWith('image')) {
      return (
        <img
          src={previewUrl}
          alt="Certificate Preview"
          style={{
            maxWidth: "100%",
            height: "auto",
            border: "1px solid #ddd",
            borderRadius: "5px",
            padding: "5px",
          }}
        />
      );
    }
    if (previewType === 'application/pdf') {
      return (
        <embed
          src={previewUrl}
          type="application/pdf"
          style={{
            width: "100%",
            height: "500px",
            border: "1px solid #ddd",
            borderRadius: "5px",
          }}
        />
      );
    }
    return <p>Unsupported certificate format.</p>;
  };

  const togglePreview = () => {
    setShowPreview(!showPreview); // Toggle the preview visibility
  };

  return (
    <div className="workout-details">
      <h4>{workout.title}</h4>
      <p>
        <strong>Activity Points: </strong>
        {workout.points}
      </p>
      <p>{formatDistanceToNow(new Date(workout.createdAt), { addSuffix: true })}</p>

      {/* Button to toggle preview visibility */}
      <button className="toggle-preview-btn" onClick={togglePreview}>
        {showPreview ? "Hide Certificate" : "Show Certificate Preview"}
      </button>

      {/* Conditionally render certificate preview */}
      {showPreview && renderCertificatePreview()}

      {/* Optional download link if previewUrl exists */}
      {showPreview && previewUrl && (
        <div style={{ marginTop: '8px' }}>
          <a href={previewUrl} download={workout?.certificate?.filename || 'certificate'}>
            Download Certificate
          </a>
        </div>
      )}

      <span className="material-symbols-outlined" onClick={handleClick}>
        delete
      </span>
    </div>
  );
};

export default WorkoutDetails;
