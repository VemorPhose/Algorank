const handleUserLogin = async (user) => {
  try {
    const response = await fetch(`http://localhost:5000/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        username: user.displayName,
        email: user.email,
        avatarUrl: user.photoURL
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sync user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing user:', error);
    throw error;
  }
};

export { handleUserLogin };