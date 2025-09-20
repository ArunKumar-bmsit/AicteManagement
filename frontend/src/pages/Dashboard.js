import { useEffect, useState } from "react";
import { useAdminWorkouts } from "../hooks/useAdminWorkouts";
import { useAuthContext } from "../hooks/useAuthContext";

const AdminPanel = () => {
  const { user } = useAuthContext();
  const { adminWorkouts, error } = useAdminWorkouts(user);
  const [previewVisible, setPreviewVisible] = useState({}); // Tracks visibility for each unique workout
  const [previewUrls, setPreviewUrls] = useState({}); // uniqueKey -> objectURL
  const [previewTypes, setPreviewTypes] = useState({}); // uniqueKey -> mime type
  const [loadingMap, setLoadingMap] = useState({}); // uniqueKey -> boolean
  const [errorMap, setErrorMap] = useState({}); // uniqueKey -> error string

  const togglePreview = (uniqueKey) => {
    setPreviewVisible((prevState) => ({
      ...prevState,
      [uniqueKey]: !prevState[uniqueKey], // Toggle visibility for the specific workout
    }));
  };

  // Load certificate blob for a given workout when toggled on
  useEffect(() => {
    let unmounted = false;
    const fetchPreviews = async () => {
      if (!user) return;
      // Load previews for keys turned on
      const keys = Object.keys(previewVisible).filter((k) => previewVisible[k]);
      for (const key of keys) {
        // Skip if already loaded
        if (previewUrls[key]) continue;
        setLoadingMap((m) => ({ ...m, [key]: true }));
        setErrorMap((m) => ({ ...m, [key]: null }));
        try {
          const [, workoutId] = key.split('-');
          const resp = await fetch(`/api/workouts/${workoutId}/certificate`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          if (!resp.ok) {
            const msg = `Failed to load certificate (${resp.status})`;
            setErrorMap((m) => ({ ...m, [key]: msg }));
            continue;
          }
          const type = resp.headers.get('Content-Type') || 'application/octet-stream';
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          if (!unmounted) {
            setPreviewUrls((m) => ({ ...m, [key]: url }));
            setPreviewTypes((m) => ({ ...m, [key]: type }));
          }
        } catch (e) {
          setErrorMap((m) => ({ ...m, [key]: 'Error loading certificate' }));
        } finally {
          if (!unmounted) setLoadingMap((m) => ({ ...m, [key]: false }));
        }
      }
    };
    fetchPreviews();
    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewVisible, user?.token]);

  // Cleanup object URLs on unmount or when adminWorkouts list changes significantly
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>
      {error && <div>Error: {error}</div>}
      {adminWorkouts.map((entry) => (
        <div key={entry.userId} className="user-workouts">
          <h3>
            {entry.userDetails?.email || "No Email"}
          </h3>
          <p>Total Points: {entry.totalPoints}/100</p>
          <ul>
            {entry.workouts.map((workout, index) => {
              const uniqueKey = `${entry.userId}-${workout._id}`; // Combine userId and workout ID
              return (
                <li key={uniqueKey} style={{ marginBottom: "20px" }}>
                  <strong>{workout.title}</strong>: {workout.points} points
                  {workout.certificate && (
                    <>
                      <button
                        className="toggle-preview-btn"
                        onClick={() => togglePreview(uniqueKey)}
                      >
                        {previewVisible[uniqueKey]
                          ? "Hide Certificate"
                          : "Show Certificate"}
                      </button>
                      {previewVisible[uniqueKey] && (
                        <div className="certificate-preview">
                          {loadingMap[uniqueKey] && <p>Loading certificate...</p>}
                          {errorMap[uniqueKey] && (
                            <p style={{ color: "red" }}>{errorMap[uniqueKey]}</p>
                          )}
                          {!loadingMap[uniqueKey] && !errorMap[uniqueKey] && previewUrls[uniqueKey] && (
                            previewTypes[uniqueKey]?.startsWith('image') ? (
                              <img
                                src={previewUrls[uniqueKey]}
                                alt="Certificate Preview"
                                style={{
                                  maxWidth: "200px",
                                  marginTop: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "5px",
                                  padding: "5px",
                                }}
                              />
                            ) : previewTypes[uniqueKey] === 'application/pdf' ? (
                              <embed
                                src={previewUrls[uniqueKey]}
                                type="application/pdf"
                                style={{
                                  width: "100%",
                                  height: "300px",
                                  marginTop: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "5px",
                                }}
                              />
                            ) : (
                              <p style={{ color: "red" }}>Unsupported certificate format.</p>
                            )
                          )}
                          {/* Download link */}
                          {!loadingMap[uniqueKey] && !errorMap[uniqueKey] && previewUrls[uniqueKey] && (
                            <div style={{ marginTop: '8px' }}>
                              <a href={previewUrls[uniqueKey]} download={workout?.certificate?.filename || 'certificate'}>
                                Download Certificate
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default AdminPanel;
