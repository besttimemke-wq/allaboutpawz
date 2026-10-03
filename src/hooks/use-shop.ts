import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export interface EnterpriseProduct {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  basePrice: string
  salePrice: string | null
  compareAtPrice: string | null
  image: string | null
  alt: string | null
  badge: string | null
  category: string | null
  featured: boolean
  isHidden: boolean
  inventoryCount: number
  specs: string | null
  materials: string | null
  ingredients: string | null
  directions: string | null
  warranty: string | null
  stripePriceId: string | null
  stripeProductId: string | null
  sortOrder: number
}

const ENTERPRISE_FALLBACKS: EnterpriseProduct[] = [
  { id: 'ep-1', name: 'Grooming Brush', slug: 'grooming-brush', description: 'Balanced, comfortable, and built to last.', shortDescription: 'Professional wooden grooming brush.', basePrice: '$26.00', salePrice: null, compareAtPrice: null, image: null, alt: 'Grooming brush', badge: null, category: 'Grooming', featured: false, isHidden: false, inventoryCount: 30, specs: null, materials: null, ingredients: null, directions: null, warranty: null, stripePriceId: null, stripeProductId: null, sortOrder: 0 },
  { id: 'ep-2', name: 'Soothing Oatmeal & Honey Shampoo', slug: 'soothing-oatmeal-honey-shampoo', description: 'Premium skin care shampoo.', shortDescription: 'Soothing formula for sensitive skin.', basePrice: '$32.00', salePrice: null, compareAtPrice: null, image: null, alt: 'Oatmeal shampoo', badge: null, category: 'Bath & Spa', featured: true, isHidden: false, inventoryCount: 35, specs: null, materials: null, ingredients: null, directions: null, warranty: null, stripePriceId: null, stripeProductId: null, sortOrder: 1 },
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function useShop() {
  const [products, setProducts] = useState<EnterpriseProduct[]>(ENTERPRISE_FALLBACKS)

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.startsWith('your-')) return

    let channel: any = null
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      channel = supabase
        .channel('enterprise_catalog_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'commerce_products' }, (payload: any) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const r = payload.new
            const mapped: EnterpriseProduct = {
              id: r.id, name: r.name, slug: r.slug, description: r.description || '',
              shortDescription: r.short_description, basePrice: r.base_price,
              salePrice: r.sale_price, compareAtPrice: r.compare_at_price,
              image: r.image, alt: r.alt, badge: r.badge, category: r.category,
              featured: r.featured, isHidden: r.is_hidden, inventoryCount: r.inventory_count,
              specs: r.specs, materials: r.materials, ingredients: r.ingredients,
              directions: r.directions, warranty: r.warranty,
              stripePriceId: r.stripe_price_id, stripeProductId: r.stripe_product_id,
              sortOrder: r.sort_order,
            }
            setProducts(prev => {
              const filtered = prev.filter(p => p.id !== mapped.id)
              return r.is_hidden ? filtered : [...filtered, mapped]
            })
          }
          if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id))
          }
        })
        .subscribe()
    })

    return () => { if (channel) channel.unsubscribe() }
  }, [])

  return { products, loading: false }
}
