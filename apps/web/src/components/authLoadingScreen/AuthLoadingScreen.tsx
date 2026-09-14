import React, { useEffect, useRef, useState } from 'react';

import styles from './AuthLoadingScreen.module.scss';

interface AuthLoadingScreenProps {
  visible: boolean;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ visible }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedFadeOutRef = useRef(false);

  useEffect(() => {
    if (visible) {
      hasStartedFadeOutRef.current = false;
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
      //33333
      setShouldRender(true);
      setIsFadingOut(false);
    } else if (shouldRender && !hasStartedFadeOutRef.current) {
      hasStartedFadeOutRef.current = true;
      setIsFadingOut(true);

      fadeOutTimerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
        hasStartedFadeOutRef.current = false;
        fadeOutTimerRef.current = null;
      }, 1500);
    }

    return () => {
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current);
        fadeOutTimerRef.current = null;
      }
    };
  }, [visible, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={`${styles.loadingScreen} ${isFadingOut ? styles.fadeOut : ''}`}>
      <div className={styles.preloaderBg}></div>
      <div className={styles.content}>
        <div className={styles.preloaderLogo}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <img src='/logo_monochrome.png' alt='Логотип' className={styles.logoImage} />
            </div>
          </div>
          <div className={styles.textContainer}>
            <div className={styles.textLine}>
              Инжиниринговый
              <br />
              центр
              <br />
              железнодорожного
              <br />
              транспорта
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
