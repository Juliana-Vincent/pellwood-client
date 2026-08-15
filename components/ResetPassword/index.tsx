import React, { useState, useEffect } from 'react';
import { modal } from 'uikit';
import { AxiosAPI } from '@/restClient';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/router';

interface ResetPasswordProps {
  history?: any;
}

const ResetPassword = ({ history }: ResetPasswordProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ password?: boolean; confirmPassword?: boolean; apiError?: boolean }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (router.query.email && typeof router.query.email === 'string') {
      try {
        setEmail(Buffer.from(router.query.email, 'base64').toString());
      } catch (e) {
        console.error("Invalid base64 email");
      }
    }
    if (router.query.resetToken && typeof router.query.resetToken === 'string') {
      setResetToken(router.query.resetToken);
    }
  }, [router.query]);

  const closeModal = () => {
    modal('#reset-password').hide();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'password' | 'confirmPassword') => {
    if (type === 'password') {
      setError(prev => ({ ...prev, password: false, apiError: false }));
      setPassword(e.target.value);
    }
    if (type === 'confirmPassword') {
      setError(prev => ({ ...prev, confirmPassword: false, apiError: false }));
      setConfirmPassword(e.target.value);
    }
  };

  const onBlur = () => {
    if (password !== confirmPassword) {
      setError(prev => ({ ...prev, confirmPassword: true }));
      return true;
    }
    return false;
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();

    if (onBlur() || !password || !confirmPassword) {
      if (!password || !confirmPassword) {
         setError(prev => ({ ...prev, password: !password, confirmPassword: !confirmPassword }));
      }
      return;
    }

    AxiosAPI.put(`/user/password`, { email, password, resetToken })
      .then(res => {
        setDone(true);
        router.replace(router.pathname, undefined, { shallow: true });
        if (history && history.push) {
          history.push({ search: '' });
        }
      })
      .catch(err => {
        console.error("Password reset failed:", err);
        setError(prev => ({ ...prev, apiError: true }));
      });
  };

  if (!mounted) return null;

  return (
    // container: false - see components/Login/index.tsx for why this is required on
    // every uk-modal in the app (otherwise React never sees input inside it).
    <div id="reset-password" className="uk-flex-top" uk-modal="container: false">
      <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
        <div className="tm-canvas-head" style={{ marginTop: 0 }}>
          <h2>{t('forgottenpassword')}</h2>
          <button 
            className="tm-canvas-close uk-close-large" 
            type="button" 
            uk-close="" 
            onClick={closeModal}
          ></button>
        </div>

        {!done && (
          <div className="login_form">
            <form onSubmit={send}>
              {error.apiError && (
                <div className="uk-alert-danger" uk-alert="">
                  <p>{t('errorSendOrder')}</p>
                </div>
              )}
              {error.confirmPassword && password !== confirmPassword && (
                <div className="uk-alert-danger" uk-alert="">
                  <p>{t('passwordMismatch')}</p>
                </div>
              )}

              <div className="uk-margin input_item">
                <input 
                  className={`${password.length ? 'hasValue' : ''} ${error.password ? 'invalid' : ''}`} 
                  type="password" 
                  value={password} 
                  onChange={e => handleInput(e, 'password')} 
                  tabIndex={1} 
                />
                <label>{t('newPassword')}</label>
              </div>
              <div className="uk-margin input_item">
                <input 
                  className={`${confirmPassword.length ? 'hasValue' : ''} ${error.confirmPassword ? 'invalid' : ''}`} 
                  type="password" 
                  onBlur={onBlur} 
                  value={confirmPassword} 
                  onChange={e => handleInput(e, 'confirmPassword')} 
                  tabIndex={2} 
                />
                <label>{t('repeatNewPassword')}</label>
              </div>

              <button type="submit" className="tm-button tm-black-button uk-width-1-1">
                {t('resetPasswordBtn')}
              </button>
            </form>
          </div>
        )}

        {done && (
          <div className="uk-alert-success" uk-alert="">
            <p>{t('passwordResetSuccess')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
