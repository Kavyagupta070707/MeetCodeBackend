export async function getCurrentUser(req, res) {
  try {
    await req.user.populate({
      path: "ratingHistory.session",
      select: "problemTitle difficulty resultReason completedAt",
    });

    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Error in getCurrentUser controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
