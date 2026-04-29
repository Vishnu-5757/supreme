import React, { useState } from 'react';
import UserFormScreen from './UserFormScreen';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';

export default function AddUserScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);
    try {
      const response = await apiRequest(`${API_BASE_URL}/users/api/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        return { ok: false, errors: data.errors, message: data.message };
      }
      return { ok: true };
    } catch {
      return { ok: false, errors: { general: 'Network error. Please try again.' } };
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFormScreen
      navigation={navigation}
      isEdit={false}
      onSubmit={handleSubmit}
      submitting={submitting}
      pageTitle="Add New User"
      pageSubtitle="Create an account and set permissions"
      submitLabel="Create User"
    />
  );
}