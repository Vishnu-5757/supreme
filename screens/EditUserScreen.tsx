import React, { useState } from 'react';
import UserFormScreen from './UserFormScreen';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
export default function EditUserScreen({ navigation, route }: any) {
  const { apiRequest } = useAuthApi();
  const user = route.params?.user;
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return null;
  }

  const initialData = {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    username: user.username || '',
    is_active: !!user.is_active,
    is_staff: !!user.is_staff,
    is_head: !!user.profile?.is_head,
    is_technician: !!user.profile?.is_technician,
    app_permissions: Array.isArray(user.app_permissions) ? user.app_permissions : [],
  };

  const handleSubmit = async (formData: any) => {
    setSubmitting(true);

    try {
      const payload: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        is_active: formData.is_active,
        is_staff: formData.is_staff,
        is_head: formData.is_head,
        is_technician: formData.is_technician,
        app_permissions: formData.app_permissions,
      };

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password;
      }

      console.log('Edit payload =>', JSON.stringify(payload, null, 2));

      const response = await apiRequest(`${API_BASE_URL}/users/api/users/${user.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      console.log('Edit response status =>', response.status);
      console.log('Edit response data =>', data);

      if (!response.ok) {
        return {
          ok: false,
          errors: data.errors || data,
          message: data.message || 'Update failed',
        };
      }

      return { ok: true, message: 'User updated successfully!' };
    } catch (error) {
      console.error('Edit error:', error);
      return {
        ok: false,
        errors: { general: 'Network error. Please try again.' },
        message: 'Network error',
      };
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserFormScreen
      navigation={navigation}
      isEdit={true}
      initialData={initialData}
      userId={user.id}
      onSubmit={handleSubmit}
      submitting={submitting}
      pageTitle="Edit User"
      pageSubtitle={`Updating ${user.username}`}
      submitLabel="Save Changes"
    />
  );
}