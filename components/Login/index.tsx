import React, { useState, useEffect, useContext } from 'react';
import { modal } from 'uikit';
import { useTranslation } from '@/hooks/useTranslation';
import validationForm from '@/functions/validationForm';
import { DataStateContext } from '@/context/dataStateContext';
import { AxiosAPI } from '@/restClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface LoginProps {
  setLoginUser: (value: boolean) => void;
}

interface LoginErrorState {
  email?: boolean | string;
  password?: boolean | string;
  confirm?: boolean;
  consent?: boolean;
}

const Login = ({ setLoginUser }: LoginProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { dataContextDispatch } = useContext(DataStateContext);
  
  const [mounted, setMounted] = useState(false);
  // Registering used to be a second button on the login form that posted the same
  // two fields: no repeated password, so a typo locked the customer out of the
  // account they had just made, and no agreement to the terms. It is a mode of
  // this modal now, with the fields registration actually needs.
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<LoginErrorState>({
    email: false,
    password: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Back to the login form whenever the modal closes, however it closes - the X,
  // Escape or a click on the backdrop - so it never reopens half-way through a
  // registration someone abandoned.
  useEffect(() => {
    if (!mounted) return;
    const el = document.getElementById('modal-login');
    if (!el) return;
    const reset = () => {
      setMode('login');
      setConfirm('');
      setConsent(false);
      setError({ email: false, password: false });
    };
    el.addEventListener('hidden', reset);
    return () => el.removeEventListener('hidden', reset);
  }, [mounted]);

  const closeModal = () => {
    modal('#modal-login').hide();
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setConfirm('');
    setConsent(false);
    setError({ email: false, password: false });
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

    // Check both fields and report both. onBlur('password') runs the email check
    // first and returns on its result, so an empty form only ever highlighted the
    // email and the customer fixed one problem at a time.
    const emailInvalid = !email.length || validationForm('email', { email }, error, setError);
    const passwordInvalid = !password.length || password.length < 8;

    if (!email.length || !password.length) {
      setError(prev => ({
        ...prev,
        email: !email.length ? 'empty' : prev.email,
        password: !password.length ? 'empty' : prev.password,
      }));
      return;
    }

    if (emailInvalid || passwordInvalid) {
      setError(prev => ({ ...prev, password: passwordInvalid ? true : prev.password }));
      return;
    }

    AxiosAPI.post(`/user/login`, { email, password }).then(res => {
      dataContextDispatch({ state: res.data.data, type: 'user' });
      setLoginUser(true);
      modal('#modal-login').hide();
      // Logging in from checkout must not navigate away - the customer loses every
      // field they have typed. The guard below was already here; an unconditional
      // second push sat underneath it and made it dead code.
      if (!router.pathname.startsWith("/basket")) {
        router.push("/user");
      }
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

  const onRegister = (e: React.FormEvent) => {
    e.preventDefault();

    const emailInvalid = !email.length || validationForm('email', { email }, error, setError);
    const passwordInvalid = password.length < 8;
    const confirmInvalid = confirm !== password;
    const consentMissing = !consent;

    setError(prev => ({
      ...prev,
      email: !email.length ? 'empty' : prev.email,
      password: !password.length ? 'empty' : passwordInvalid ? true : false,
      confirm: confirmInvalid,
      consent: consentMissing,
    }));
    if (emailInvalid || passwordInvalid || confirmInvalid || consentMissing) {
      return;
    }

    AxiosAPI.post(`/user`, { email, password }).then(res => {
      dataContextDispatch({ state: res.data.data, type: 'user' });
      setLoginUser(true);
      // The modal used to stay open after a successful registration (and with it
      // UIkit's scroll lock on the page underneath).
      modal('#modal-login').hide();
      // Same rule as login: registering from checkout must not navigate away and
      // throw away the form the customer has been filling in.
      if (!router.pathname.startsWith("/basket")) {
        router.push("/user");
      }
    }).catch(err => {
      // Empty-input (400) and already-registered (409) are expected, real outcomes
      // of this request, not just failures - but axios rejects on any non-2xx
      // status, so they land here rather than in .then().
      const apiError = err.response?.data?.error;
      if (apiError === 'email') {
        setError(prev => ({ ...prev, email: 'exist' }));
      } else if (apiError === 'password') {
        setError(prev => ({ ...prev, password: true }));
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
          <h2>{mode === 'login' ? t('login') : t('registration')}</h2>
          <button 
            className="tm-canvas-close uk-close-large" 
            type="button" 
            uk-close="" 
            onClick={closeModal}
          ></button>
        </div>

        <div className="login_form">
          <form onSubmit={mode === 'login' ? onLogin : onRegister}>
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

            {/* The short-password branch sets error.password = true, which no
                banner matched - the field turned red, nothing was said, and no
                request was sent. */}
            {error.password === true && (
              <div className="uk-alert-danger" uk-alert="">
                <p>{t('passwordTooShort')}</p>
              </div>
            )}

            <div className="uk-margin input_item">
              {/* id + htmlFor so the floating label is clickable, and
                  autoComplete so password managers can fill the form. */}
              <input
                id="login-email"
                name="email"
                autoComplete="email"
                className={`${email.length ? 'hasValue' : ''} ${!!error.email ? 'invalid' : ''}`}
                type="email"
                value={email}
                onBlur={() => onBlur('email')}
                onChange={e => handleInput(e, 'email')}
                tabIndex={1} 
              />
              <label htmlFor="login-email">{t('formemail')}</label>
            </div>
            
            <div className="uk-margin input_item">
              <input
                id="login-password"
                name="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={`${password.length ? 'hasValue' : ''} ${(error.password || error.email === 'notExist') ? 'invalid' : ''}`}
                type="password"
                onBlur={() => onBlur('password')}
                value={password}
                onChange={e => handleInput(e, 'password')}
                tabIndex={2}
              />
              <label htmlFor="login-password">{t('formpassword')}</label>
            </div>

            {mode === 'register' && (
              <>
                {error.confirm && (
                  <div className="uk-alert-danger" uk-alert="">
                    <p>{t('passwordMismatch')}</p>
                  </div>
                )}
                <div className="uk-margin input_item">
                  <input
                    id="login-password-confirm"
                    name="password-confirm"
                    autoComplete="new-password"
                    className={`${confirm.length ? 'hasValue' : ''} ${error.confirm ? 'invalid' : ''}`}
                    type="password"
                    value={confirm}
                    onChange={e => {
                      setError(prev => ({ ...prev, confirm: false }));
                      setConfirm(e.target.value);
                    }}
                    tabIndex={3}
                  />
                  <label htmlFor="login-password-confirm">{t('confirmPassword')}</label>
                </div>

                {error.consent && (
                  <div className="uk-alert-danger" uk-alert="">
                    <p>{t('consentRequired')}</p>
                  </div>
                )}
                <div className="uk-margin checkbox_item">
                  <input
                    type="checkbox"
                    id="register-consent"
                    checked={consent}
                    onChange={() => {
                      setError(prev => ({ ...prev, consent: false }));
                      setConsent(!consent);
                    }}
                  />
                  <label htmlFor="register-consent"></label>
                  <label htmlFor="register-consent">
                    {t('registerConsent')}{' '}
                    <Link href={t('linkBusiness')} target="_blank" rel="noopener noreferrer">
                      {t('accessCondition2')}
                    </Link>
                  </label>
                </div>
              </>
            )}

            <button type="submit" className="tm-button tm-black-button uk-width-1-1">
              {mode === 'login' ? t('login') : t('registration')}
            </button>

            {mode === 'login' ? (
              <>
                <button type="button" onClick={forgotPassword} className="tm-button tm-bare-button tm-button-text uk-width-1-1">
                  <span>{t('forgottenpassword')}</span>
                </button>
                <hr />
                <p>{t('notyetaccount')}</p>
                <button type='button' className="tm-button tm-bare-button uk-width-1-1" onClick={() => switchMode('register')}>
                  <span>{t('registration')}</span>
                </button>
              </>
            ) : (
              <>
                <hr />
                <p>{t('haveAccount')}</p>
                <button type='button' className="tm-button tm-bare-button uk-width-1-1" onClick={() => switchMode('login')}>
                  <span>{t('login')}</span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
