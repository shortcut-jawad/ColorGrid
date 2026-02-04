function sanitizeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    profile_picture_url: user.profile_picture_url || "",
    coins: user.coins ?? 0,
  };
}

export { sanitizeUser };
