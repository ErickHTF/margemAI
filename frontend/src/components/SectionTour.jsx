import { useCallback, useRef, useState } from 'react'
import GuidedTour from './GuidedTour'
import { TourContext } from './TourContext'
import { MENU_TOURS, PROFILE_EDIT_TOUR } from '../data/menuTours'

export default function SectionTour({ section, children }) {
  const rootRef = useRef(null)
  const storageKey = section === 'accounts' ? 'margemai.accounts-tour.v1' : `margemai.tour.${section}.v1`
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(storageKey) !== 'seen' } catch { return true }
  })
  const [customSteps, setCustomSteps] = useState(null)
  const showTour = useCallback(() => {
    if (section === 'profile' && rootRef.current?.querySelector('[data-tour="profile-form"]')) setCustomSteps(PROFILE_EDIT_TOUR)
    else if (section === 'sales' && !rootRef.current?.querySelector('[data-tour="sales-form"]')) {
      setCustomSteps(MENU_TOURS.sales.map((step, index) => index ? step : { ...step, target: 'sales-new', text: 'Abra a venda rápida para informar item, preço e pagamento.' }))
    } else setCustomSteps(null)
    setOpen(true)
  }, [section])
  const closeTour = useCallback(() => {
    setOpen(false)
    try { localStorage.setItem(storageKey, 'seen') } catch { /* Keep the tour available when storage is blocked. */ }
  }, [storageKey])
  const steps = customSteps || MENU_TOURS[section]
  return <TourContext.Provider value={steps ? showTour : null}>
    <div ref={rootRef} inert={open && !!steps ? true : undefined} aria-hidden={open && !!steps ? true : undefined}>{children}</div>
    {open && steps && <GuidedTour rootRef={rootRef} steps={steps} onClose={closeTour} />}
  </TourContext.Provider>
}
