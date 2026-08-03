import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** One shared fetch pattern for every rating badge in the app. */
export function useReviewAggregate(subjectType, subjectId) {
  const [avgRating, setAvgRating] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!subjectType || !subjectId) return
    let cancelled = false
    supabase
      .from('review_aggregates')
      .select('avg_rating, review_count')
      .eq('subject_type', subjectType)
      .eq('subject_id', String(subjectId))
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setAvgRating(data?.avg_rating ?? 0)
        setCount(data?.review_count ?? 0)
      })
    return () => { cancelled = true }
  }, [subjectType, subjectId])

  return { avgRating, count }
}
