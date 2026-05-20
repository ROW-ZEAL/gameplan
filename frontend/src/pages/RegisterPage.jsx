import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    password2: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    if (form.password !== form.password2) {
      setErrors({ password2: "Passwords don't match." })
      return
    }

    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.phone_number) delete payload.phone_number
      await register(payload)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // DRF returns field-level errors as arrays
        const flat = {}
        for (const [key, val] of Object.entries(data)) {
          flat[key] = Array.isArray(val) ? val[0] : val
        }
        setErrors(flat)
      } else {
        setErrors({ non_field: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function field(name, label, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          name={name}
          value={form[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition ${
            errors[name]
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-300 focus:border-emerald-500'
          }`}
        />
        {errors[name] && (
          <p className="mt-1 text-xs text-red-600">{errors[name]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-emerald-600">GamePlanR</span>
          <p className="text-gray-500 mt-1 text-sm">Create your account</p>
        </div>

        {errors.non_field && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {errors.non_field}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {field('full_name', 'Full name', 'text', 'John Doe')}
          {field('email', 'Email address', 'email', 'you@example.com')}
          {field('phone_number', 'Phone number (optional)', 'tel', '+1 555 000 0000')}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Min. 8 characters"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition ${
                errors.password ? 'border-red-400' : 'border-gray-300 focus:border-emerald-500'
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              name="password2"
              value={form.password2}
              onChange={handleChange}
              required
              placeholder="Repeat password"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition ${
                errors.password2 ? 'border-red-400' : 'border-gray-300 focus:border-emerald-500'
              }`}
            />
            {errors.password2 && <p className="mt-1 text-xs text-red-600">{errors.password2}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2.5 rounded-lg transition text-sm"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
