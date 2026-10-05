import React from 'react';
import { useTranslation } from '@/hooks/useTranslation'

interface PasswordProps {
  state: string;
  setState: React.Dispatch<React.SetStateAction<string>>;
}

const Password = ({ state, setState }: PasswordProps) => {
  const { t } = useTranslation()

  return(
    <div className="form_column">
      <div className="input_item">
        <input 
          id="checkout-password"
          name="new-password"
          autoComplete="new-password"
          className={state.length ? 'hasValue' : undefined} 
          type="password" 
          value={state} 
          onChange={(e) => setState(e.target.value)}
        />
        <label htmlFor="checkout-password">{t('formpassword')}</label>
      </div>
      <div></div>
    </div>
  )
}

export default Password
