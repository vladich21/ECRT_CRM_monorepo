import { MailOutlined, PhoneOutlined } from '@ant-design/icons';

import type { User } from '../../types/user';
import pi from '../pageLayout/profileInfoCards.module.scss';

type Props = {
  user: User;
  shellClassName: string;
};

export function UserProfileBody({ user, shellClassName }: Props) {
  const hasHrExtra = Boolean(
    user.personnel_number ||
      user.hired_at ||
      user.quit_date ||
      user.supervisor?.name ||
      user.supervisor?.email ||
      user.external_user_id,
  );

  return (
    <div className={shellClassName}>
      <div className={pi.contentMax}>
        <div className={pi.cardsSurface} role='presentation'>
          <div className={pi.cardsGrid}>
            <section className={pi.infoCard} aria-labelledby='profile-work-heading'>
              <header className={pi.cardHead}>
                <h2 id='profile-work-heading' className={pi.cardTitle}>
                  Работа и организация
                </h2>
              </header>
              <div className={pi.fieldList}>
                <div className={pi.field}>
                  <span className={pi.fieldLabel}>Отдел</span>
                  <span className={user.department?.name ? pi.fieldValue : pi.fieldValueMuted}>
                    {user.department?.name || 'Не указано'}
                  </span>
                </div>
                <div className={pi.field}>
                  <span className={pi.fieldLabel}>Должность</span>
                  <span className={user.position?.name ? pi.fieldValue : pi.fieldValueMuted}>
                    {user.position?.name || 'Не указано'}
                  </span>
                </div>

                {hasHrExtra ? (
                  <>
                    <div className={pi.hrFieldsStart} role='separator' aria-hidden />
                    {user.personnel_number != null && user.personnel_number !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Табельный номер</span>
                        <span className={pi.fieldValue}>{user.personnel_number}</span>
                      </div>
                    )}
                    {user.hired_at != null && user.hired_at !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Дата приёма</span>
                        <span className={pi.fieldValue}>{user.hired_at}</span>
                      </div>
                    )}
                    {user.quit_date != null && user.quit_date !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Дата увольнения</span>
                        <span className={pi.fieldValue}>{user.quit_date}</span>
                      </div>
                    )}
                    {user.supervisor?.name != null && user.supervisor.name.trim() !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Руководитель</span>
                        <span className={pi.fieldValue}>{user.supervisor.name}</span>
                      </div>
                    )}
                    {user.supervisor?.email != null && user.supervisor.email.trim() !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Email руководителя</span>
                        <a href={`mailto:${user.supervisor.email}`} className={pi.valueLink}>
                          <MailOutlined /> {user.supervisor.email}
                        </a>
                      </div>
                    )}
                    {user.external_user_id != null && user.external_user_id !== '' && (
                      <div className={pi.field}>
                        <span className={pi.fieldLabel}>Корпоративный ID</span>
                        <span className={pi.fieldMono}>{user.external_user_id}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </section>

            <aside className={pi.cardsSidebar} aria-label='Личные данные и контакты'>
              <section className={pi.infoCard} aria-labelledby='profile-personal-heading'>
                <header className={pi.cardHead}>
                  <h2 id='profile-personal-heading' className={pi.cardTitle}>
                    Личные данные
                  </h2>
                </header>
                <div className={pi.fieldList}>
                  <div className={pi.field}>
                    <span className={pi.fieldLabel}>Фамилия</span>
                    <span className={user.last_name ? pi.fieldValue : pi.fieldValueMuted}>
                      {user.last_name || 'Не указано'}
                    </span>
                  </div>
                  <div className={pi.field}>
                    <span className={pi.fieldLabel}>Имя</span>
                    <span className={user.first_name ? pi.fieldValue : pi.fieldValueMuted}>
                      {user.first_name || 'Не указано'}
                    </span>
                  </div>
                  <div className={pi.field}>
                    <span className={pi.fieldLabel}>Отчество</span>
                    <span className={user.middle_name ? pi.fieldValue : pi.fieldValueMuted}>
                      {user.middle_name || 'Не указано'}
                    </span>
                  </div>
                </div>
              </section>

              <section className={pi.infoCard} aria-labelledby='profile-contact-heading'>
                <header className={pi.cardHead}>
                  <h2 id='profile-contact-heading' className={pi.cardTitle}>
                    Контакты
                  </h2>
                </header>
                <div className={pi.fieldList}>
                  <div className={pi.field}>
                    <span className={pi.fieldLabel}>Email</span>
                    {user.email ? (
                      <a href={`mailto:${user.email}`} className={pi.valueLink}>
                        <MailOutlined /> {user.email}
                      </a>
                    ) : (
                      <span className={pi.fieldValueMuted}>Не указано</span>
                    )}
                  </div>
                  <div className={pi.field}>
                    <span className={pi.fieldLabel}>Телефон</span>
                    {user.phone ? (
                      <a href={`tel:${user.phone.replace(/\D/g, '')}`} className={pi.valueLink}>
                        <PhoneOutlined /> {user.phone}
                      </a>
                    ) : (
                      <span className={pi.fieldValueMuted}>Не указано</span>
                    )}
                  </div>
                  {user.internal_phone != null && user.internal_phone !== '' && (
                    <div className={pi.field}>
                      <span className={pi.fieldLabel}>Внутренний</span>
                      <span className={pi.fieldValue}>{user.internal_phone}</span>
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
