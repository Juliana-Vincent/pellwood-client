import React, { useState, useEffect, useContext } from 'react';
import { modal } from 'uikit';
import { useTranslation } from '@/hooks/useTranslation';
import validationForm from '@/functions/validationForm';
import { DataStateContext } from '@/context/dataStateContext';
import { AxiosAPI } from '@/restClient';
import { useRouter } from 'next/router';

interface LoginProps {
  setLoginUser: (value: boolean) => void;
}

interface LoginErrorState {
  email?: boolean | string;
  password?: boolean | string;
}

const Login = ({ setLoginUser }: LoginProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { dataContextDispatch } = useContext(DataStateContext);
  
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginErrorState>({
    email: false,
    password: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeModal = () => {
    modal('#modal-login').hide();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'email' | 'password') => {
    if (type === 'email') {
      setError(prev => ({ ...prev, email: false }));
      setEmail(e.target.value);
    } else if (type === 'password') {
      setError(prev => ({ ...prev, password: false }));
      setPassword(e.target.value);
    }
  };

  const onBlur = (type: 'email' | 'password') => {
    if (validationForm('email', { email }, error, setError)) {
      return true;
    }
    if (type === 'password' && password.length < 8 && password.length > 0) {
      setError(prev => ({ ...prev, password: true }));
      return true;
    }
    return false;
  };

  const forgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    modal('#modal-login').hide();
    modal('#forgot-password').show();
  };

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (onBlur('email') || onBlur('password')) {
      return;
    }

    AxiosAPI.post(`/user/login`, { email, password }).then(res => {
      dataContextDispatch({ state: res.data.data, type: 'user' });
      setLoginUser(true);
      modal('#modal-login').hide();
    }).catch(err => {
      // 401 means the credentials were genuinely wrong - anything else (network
      // failure, 500) isn't, and telling the customer their password is wrong when
      // the real problem is the server being unreachable is actively misleading.
      if (err.response?.status === 401) {
        setError(prev => ({ ...prev, email: 'notExist' }));
      } else {
        console.error("Login failed:", err);
        setError(prev => ({ ...prev, email: 'serverError' }));
      }
    });
  };

  const onRegister = (e: React.MouseEvent) => {
    e.preventDefault();

    if (onBlur('email') || onBlur('password')) {
      return;
    }

    AxiosAPI.post(`/user`, { email, password }).then(res => {
      dataContextDispatch({ state: res.data.data, type: 'user' });
      setLoginUser(true);
      router.push("/user");
    }).catch(err => {
      // Empty-input (400) and already-registered (409) are expected, real outcomes
      // of this request, not just failures - but axios rejects on any non-2xx
      // status, so they land here rather than in .then() (this used to check
      // res.data.error inside .then(), which could never run: a 409/400 response
      // never reaches the success branch, so registering with a taken email - or
      // any other API-reported validation failure - silently did nothing at all).
      const apiError = err.response?.data?.error;
      if (apiError === 'email') {
        setError(prev => ({ ...prev, email: 'exist' }));
      } else if (Array.isArray(apiError) && apiError.includes('password')) {
        setError(prev => ({ ...prev, password: 'empty' }));
      } else if (Array.isArray(apiError) && apiError.includes('email')) {
        setError(prev => ({ ...prev, email: 'empty' }));
      } else {
        console.error("Registration failed:", err);
        setError(prev => ({ ...prev, email: 'serverError' }));
      }
    });
  };

  if (!mounted) return null;

  return (
    // container: false keeps this modal in its original React-rendered position
    // instead of UIkit's default of moving it to a direct child of <body> - that
    // move takes it outside Next's root container, breaking React's event
    // delegation for every input/button inside once the modal is first opened
    // (confirmed via fiber inspection: typing updated the raw DOM value but
    // React's own state never saw it, so this login form couldn't be submitted
    // with anything actually typed into it).
    <div id="modal-login" className="uk-flex-top" uk-modal="container: false">
      <div className="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
        <div className="tm-canvas-head">
          <h2>{t('login')}</h2>
          <button 
            className="tm-canvas-close uk-close-large" 
            type="button" 
            uk-close="" 
            onClick={closeModal}
          ></button>
        </div>

        <div className="login_form">
          <form onSubmit={onLogin}>
            {error.email === 'notExist' && (
              <div className="uk-alert-danger" uk-alert="">
                <p>{t('loginErrorWrong')}</p>
              </div>
            )}

            {error.email === 'exist' && (
              <div className="uk-alert-danger" uk-alert="">
                <p>{t('loginErrorExist')}</p>
              </div>
            )}

            {error.email === 'serverError' && (
              <div className="uk-alert-danger" uk-alert="">
                <p>{t('errorSendOrder')}</p>
              </div>
            )}

            {(error.email === 'empty' || error.password === 'empty') && (
              <div className="uk-alert-danger" uk-alert="">
                <p>{t('emptyFields')}</p>
              </div>
            )}

            <div className="uk-margin input_item">
              <input
                className={`${email.length ? 'hasValue' : ''} ${!!error.email ? 'invalid' : ''}`}
                type="email"
                value={email}
                onBlur={() => onBlur('email')}
                onChange={e => handleInput(e, 'email')}
                tabIndex={1} 
              />
              <label>{t('formemail')}</label>
            </div>
            
            <div className="uk-margin input_item">
              <input
                className={`${password.length ? 'hasValue' : ''} ${(error.password || error.email === 'notExist') ? 'invalid' : ''}`}
                type="password"
                onBlur={() => onBlur('password')}
                value={password}
                onChange={e => handleInput(e, 'password')}
                tabIndex={2}
              />
              <label>{t('formpassword')}</label>
            </div>

            <button type="submit" className="tm-button tm-black-button uk-width-1-1">
              {t('login')}
            </button>
            <a href="/" onClick={forgotPassword} className="tm-button tm-bare-button tm-button-text uk-width-1-1">
              <span>{t('forgottenpassword')}</span>
            </a>
            
            <hr />
            
            <p>{t('notyetaccount')}</p>
            <button className="tm-button tm-bare-button uk-width-1-1" onClick={onRegister}>
              <span>{t('registration')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
