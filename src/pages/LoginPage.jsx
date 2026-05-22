import { Form, Field } from 'react-final-form';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api.php';

export default function LoginPage() {
  const navigate = useNavigate();

  async function onSubmit(values) {
    const response = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem('clinicToken', result.token);
      localStorage.setItem('clinicUser', JSON.stringify(result.user));
      navigate('/doctors');
    } else {
      alert(result.error || 'Login error');
    }
  }

  return (
    <div className="auth-page">
      <h1>Login</h1>

      <Form
        onSubmit={onSubmit}
        render={({ handleSubmit }) => (
          <form onSubmit={handleSubmit}>
            <Field name="username">
              {({ input }) => <input {...input} placeholder="Username" />}
            </Field>

            <Field name="password">
              {({ input }) => (
                <input {...input} type="password" placeholder="Password" />
              )}
            </Field>

            <button type="submit">Login</button>
          </form>
        )}
      />
    </div>
  );
}