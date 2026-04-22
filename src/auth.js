import supabase from './supabase';

// Register new user
export async function registerUser(userData) {
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name,
        role: userData.role,
        specialization: userData.specialization || null,
        age: userData.age || null,
        blood_group: userData.bloodGroup || null,
      }
    }
  });
  if (error) throw error;
  return data;
}

// Login user
export async function loginUser(email
