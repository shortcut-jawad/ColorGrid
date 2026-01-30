import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../css/update-profile.css";
import { API_URL } from "../lib/env";

export default function UpdateProfile() {
  const { user, updateUser, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePreview, setProfilePreview] = useState(
    user?.profile_picture_url || ""
  );
  const [removePicture, setRemovePicture] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleFileChange = (file?: File) => {
    if (!file) {
      setProfilePreview(user.profile_picture_url || "");
      setRemovePicture(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePreview(reader.result);
        setRemovePicture(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    const updateData: any = {
      username: username !== user.username ? username : undefined,
      profile_picture_url: removePicture
        ? ""
        : profilePreview !== user.profile_picture_url
        ? profilePreview
        : undefined,
    };

    if (newPassword) {
      updateData.current_password = currentPassword;
      updateData.new_password = newPassword;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    if (Object.keys(updateData).length === 0) {
      setError("No changes to update");
      return;
    }

    const previousPicture = user.profile_picture_url || "";
    const shouldUpdatePicture = updateData.profile_picture_url !== undefined;

    try {
      if (shouldUpdatePicture) {
        updateUser({ profile_picture_url: updateData.profile_picture_url });
      }

      const response = await axios.put(
        `${API_URL}/api/users/profile`,
        updateData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      updateUser(response.data);
      setProfilePreview(response.data.profile_picture_url || "");
      setRemovePicture(false);
      setSuccess("Profile updated successfully");
      await refreshUser();

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (shouldUpdatePicture) {
        navigate("/home");
      }
    } catch (err: any) {
      if (shouldUpdatePicture) {
        updateUser({ profile_picture_url: previousPicture });
      }
      setError(err.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="update-profile-container">
      <h2>Update Profile</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profilePic">Upload Profile Picture</label>
          <input
            type="file"
            id="profilePic"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
          {profilePreview && (
            <img
              src={profilePreview}
              alt="Profile preview"
              className="profile-preview"
            />
          )}
          {user.profile_picture_url && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setProfilePreview("");
                setRemovePicture(true);
              }}
            >
              Remove Picture
            </button>
          )}
        </div>

        <div className="password-section">
          <h3>Change Password</h3>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="button-group">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
