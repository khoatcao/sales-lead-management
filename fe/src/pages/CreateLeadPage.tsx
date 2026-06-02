import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createLead } from '../api/leads'

const schema = z.object({
  seller_name: z.string().min(1, 'Required'),
  seller_email: z.string().email('Invalid email'),
  seller_phone: z.string().optional(),
  make: z.string().min(1, 'Required'),
  model: z.string().min(1, 'Required'),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  asking_price: z.coerce.number().positive('Must be positive'),
  urgency: z.enum(['urgent', 'flexible', 'no_rush']),
  car_notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function CreateLeadPage() {
  const navigate = useNavigate()
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [photos, setPhotos] = useState<{ url: string; label: string }[]>([])
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoLabel, setPhotoLabel] = useState('exterior')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { condition: 'good', urgency: 'flexible' },
  })

  const addFeature = () => {
    const val = featureInput.trim()
    if (val && !features.includes(val)) {
      setFeatures((f) => [...f, val])
      setFeatureInput('')
    }
  }

  const removeFeature = (f: string) => setFeatures((prev) => prev.filter((x) => x !== f))

  const addPhoto = () => {
    const url = photoUrl.trim()
    if (url) {
      setPhotos((p) => [...p, { url, label: photoLabel }])
      setPhotoUrl('')
      setPhotoLabel('exterior')
    }
  }

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index))

  const onSubmit = async (data: FormData) => {
    try {
      const lead = await createLead({
        seller_name: data.seller_name,
        seller_email: data.seller_email,
        seller_phone: data.seller_phone || undefined,
        car: {
          make: data.make,
          model: data.model,
          year: data.year,
          mileage: data.mileage,
          condition: data.condition,
          asking_price: data.asking_price,
          urgency: data.urgency,
          notes: data.car_notes || undefined,
          features,
          photos,
        },
      })
      navigate(`/leads/${lead.id}`)
    } catch {
      setError('root', { message: 'Failed to create lead. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/leads')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-gray-900">New Lead</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Seller Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Seller Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  {...register('seller_name')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
                {errors.seller_name && <p className="text-red-500 text-xs mt-1">{errors.seller_name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...register('seller_email')}
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                  {errors.seller_email && <p className="text-red-500 text-xs mt-1">{errors.seller_email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    {...register('seller_phone')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 555 0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Car Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Car Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    {...register('make')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Toyota"
                  />
                  {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    {...register('model')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Camry"
                  />
                  {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    {...register('year')}
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2020"
                  />
                  {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (km)</label>
                  <input
                    {...register('mileage')}
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50000"
                  />
                  {errors.mileage && <p className="text-red-500 text-xs mt-1">{errors.mileage.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price ($)</label>
                  <input
                    {...register('asking_price')}
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15000"
                  />
                  {errors.asking_price && <p className="text-red-500 text-xs mt-1">{errors.asking_price.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    {...register('condition')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                  <select
                    {...register('urgency')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="flexible">Flexible</option>
                    <option value="no_rush">No Rush</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Sunroof, Leather seats"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() => removeFeature(f)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photos (optional)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhoto())}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <select
                    value={photoLabel}
                    onChange={(e) => setPhotoLabel(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exterior">Exterior</option>
                    <option value="interior">Interior</option>
                    <option value="engine">Engine</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={addPhoto}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
                {photos.length > 0 && (
                  <div className="space-y-2">
                    {photos.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <span className="text-gray-400 capitalize">[{p.label}]</span>
                        <span className="flex-1 text-gray-600 truncate">{p.url}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  {...register('car_notes')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any additional notes about the car..."
                />
              </div>
            </div>
          </div>

          {errors.root && (
            <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg">{errors.root.message}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
