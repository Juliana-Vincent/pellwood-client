import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from '@/hooks/useTranslation'

interface ButtonsSubmitProps {
  sendOrder?: () => void;
  /** True while the order POST is in flight - disables the button and shows a
   *  spinner, so a customer on a slow connection can't place the order twice. */
  submitting?: boolean;
}

const ButtonsSubmit = ({ sendOrder, submitting = false }: ButtonsSubmitProps) => {
  const router = useRouter()
  const { t } = useTranslation()

  return(
    <>
      {router.pathname === '/basket' && (
        <Link href="/basket/checkout" className="tm-button tm-black-button">
          {t('checkout')}
        </Link>
      )}
      
      {router.pathname === '/basket/checkout' && (
        <button
          className="tm-button tm-black-button"
          onClick={sendOrder}
          disabled={submitting}
        >
          {submitting && (
            <div uk-spinner="" className="uk-icon uk-spinner"></div>
          )}
          {t('sendorder')}
        </button>
      )}
    </>
  )
}

export default ButtonsSubmit
