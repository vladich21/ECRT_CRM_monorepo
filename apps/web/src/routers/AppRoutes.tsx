import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import { Loader } from '../components/loader/Loader';
import MainLayout from '../layouts/MainLayout';

import PrivateRoute from './PrivateRoute';

const CommentsList = lazy(() => import('../components/comments/CommentsList'));
const EntityFilesTab = lazy(() =>
  import('../components/entityFiles/EntityFilesTab').then(m => ({ default: m.EntityFilesTab })),
);

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const ProjectEditPage = lazy(() => import('../pages/referenceBooks/projects/ProjectEditPage'));
const ProjectCreatePage = lazy(() => import('../pages/referenceBooks/projects/ProjectCreatePage'));
const PartnersListPage = lazy(() => import('../pages/partners/PartnersListPage'));
const PartnerDetailsPage = lazy(() => import('../pages/partners/PartnerDetailsPage'));
const PartnerCreatePage = lazy(() => import('../pages/partners/PartnerCreatePage'));
const PartnerEditPage = lazy(() => import('../pages/partners/PartnersEditPage'));
const PartnerContactsListPage = lazy(() => import('../pages/partners/detailsTabs/Contacts/ContactsListPage'));
const PartnerMainInfoTab = lazy(() => import('../pages/partners/registry/PartnerOverviewTab'));
const PartnerVerificationTab = lazy(() => import('../pages/partners/detailsTabs/PartnerVerificationTab'));
const PartnerEvaluationsTab = lazy(() => import('../pages/partners/evaluations/PartnerEvaluationsTab'));
const SupplierEvaluationsRegistryPage = lazy(() => import('../pages/supplierEvaluations/SupplierEvaluationsRegistryPage'));
const PartnerTypesListPage = lazy(() => import('../pages/referenceBooks/partnerTypes/PartnerTypesListPage'));
const PartnerStatusesListPage = lazy(() => import('../pages/referenceBooks/partnerStatuses/PartnerStatusesListPage'));
const ContractsListPage = lazy(() => import('../pages/contracts/list/ContractsListPage'));
const ContractCreatePage = lazy(() => import('../pages/contracts/create/ContractCreatePage'));
const ContractDetailsPage = lazy(() => import('../pages/contracts/details/ContractDetailsPage'));
const ContractEditPage = lazy(() => import('../pages/contracts/edit/ContractEditPage'));
const PartnerCompetencesListPage = lazy(() => import('../pages/referenceBooks/competencies/CompetenciesListPage'));
const PartnerCompetenceCreatePage = lazy(() => import('../pages/referenceBooks/competencies/CompetenceCreatePage'));
const PartnerCompetenceEditPage = lazy(() => import('../pages/referenceBooks/competencies/CompetencyEditPage'));
const ContractMainInfoTab = lazy(() =>
  import('../pages/contracts/details/tabs/main/ContractMainInfoTab').then(m => ({ default: m.ContractMainInfoTab })),
);
const ContractAdditionalAgreementsTab = lazy(() =>
  import('../pages/contracts/details/tabs/additionalAgreements/ContractAdditionalAgreementsTab').then(m => ({
    default: m.ContractAdditionalAgreementsTab,
  })),
);
const ContractHistoryTab = lazy(() =>
  import('../pages/contracts/details/tabs/history/ContractHistoryTab').then(m => ({ default: m.ContractHistoryTab })),
);
const PatentCreatePage = lazy(() => import('../pages/patents/PatentCreatePage'));
const PatentEditPage = lazy(() => import('../pages/patents/PatentEditPage'));
const PatentDetailsPage = lazy(() => import('../pages/patents/PatentDetailsPage'));
const PatentMainInfoTab = lazy(() =>
  import('../pages/patents/detailsTabs/PatentMainInfoTab').then(m => ({ default: m.PatentMainInfoTab })),
);
const PartnerEconomicCategoriesListPage = lazy(
  () => import('../pages/referenceBooks/partnerEconomicCategories/EconomicCategoriesListPage'),
);
const ContractTypesListPage = lazy(() => import('../pages/referenceBooks/contractTypes/ContractTypesListPage'));
const PatentGrantsListPage = lazy(() => import('../pages/referenceBooks/patentGrants/PatentGrantsListPage'));
const PatentGrantsRegistryPage = lazy(() => import('../pages/referenceBooks/patentGrants/PatentGrantsRegistryPage'));
const PatentGrantCreatePage = lazy(() => import('../pages/referenceBooks/patentGrants/PatentGrantCreatePage'));
const PatentGrantEditPage = lazy(() => import('../pages/referenceBooks/patentGrants/PatentGrantEditPage'));
const PatentGrantDetailsPage = lazy(() => import('../pages/referenceBooks/patentGrants/PatentGrantDetailsPage'));
const PatentGrantMainInfoTab = lazy(() =>
  import('../pages/referenceBooks/patentGrants/detailsTabs/PatentGrantMainInfoTab').then(m => ({
    default: m.PatentGrantMainInfoTab,
  })),
);
const PatentAreasListPage = lazy(() => import('../pages/referenceBooks/patentAreas/PatentAreasListPage'));
const GanttsPage = lazy(() => import('../pages/gantt/GanttsPage'));
const HomePage = lazy(() => import('../pages/home/HomePage'));
const NotFound = lazy(() => import('../pages/NotFound'));
const PatentsListPage = lazy(() => import('../pages/patents/PatentsListPage'));
const ProfilePage = lazy(() => import('../pages/profile/Profile'));
const DepartmentsListPage = lazy(() => import('../pages/referenceBooks/departaments/DepartmentsListPage'));
const PositionsListPage = lazy(() => import('../pages/referenceBooks/positions/PositionsListPage'));
const ProjectDetailsPage = lazy(() => import('../pages/referenceBooks/projects/ProjectDetailsPage'));
const ProjectsListPage = lazy(() => import('../pages/referenceBooks/projects/ProjectsListPage'));
const UserDetailsPage = lazy(() => import('../pages/referenceBooks/users/UserDetailsPage'));
const UsersListPage = lazy(() => import('../pages/referenceBooks/users/UsersListPage'));

const Private = ({ children }: { children: React.ReactNode }) => <PrivateRoute>{children}</PrivateRoute>;

const RedirectToUsersList = () => <Navigate to="/users" replace />;

const RedirectUserEditToDetails = () => {
  const { userId } = useParams();
  return <Navigate to={userId ? `/users/${userId}` : '/users'} replace />;
};

const suspenseFallback = <Loader />;

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <Suspense fallback={suspenseFallback}>
            <LoginPage />
          </Suspense>
        }
      />

      <Route
        path="/"
        element={
          <Private>
            <MainLayout />
          </Private>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="home" element={<HomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="users">
          <Route index element={<UsersListPage />} />
          <Route path="create" element={<RedirectToUsersList />} />
          <Route path=":userId/edit" element={<RedirectUserEditToDetails />} />
          <Route path=":userId" element={<UserDetailsPage />} />
        </Route>

        <Route path="departments">
          <Route index element={<DepartmentsListPage />} />
          <Route path="create" element={<Navigate to="/departments" replace />} />
          <Route path=":departmentId/edit" element={<Navigate to="/departments" replace />} />
          <Route path=":departmentId" element={<Navigate to="/departments" replace />} />
        </Route>

        <Route path="positions">
          <Route index element={<PositionsListPage />} />
        </Route>

        <Route path="projects">
          <Route index element={<ProjectsListPage />} />
          <Route path="create" element={<ProjectCreatePage />} />
          <Route path=":projectId/edit" element={<ProjectEditPage />} />
          <Route path=":projectId" element={<ProjectDetailsPage />} />
        </Route>

        <Route path="gantts">
          <Route index element={<GanttsPage />} />
        </Route>

        <Route path="competencies">
          <Route index element={<PartnerCompetencesListPage />} />
          <Route path="create" element={<PartnerCompetenceCreatePage />} />
          <Route path=":competenceId/edit" element={<PartnerCompetenceEditPage />} />
        </Route>

        <Route path="admin">
          <Route path="partner-types" element={<PartnerTypesListPage />} />
          <Route path="partner-statuses" element={<PartnerStatusesListPage />} />
          <Route path="partner-economic-categories" element={<PartnerEconomicCategoriesListPage />} />
          <Route path="contract-types" element={<ContractTypesListPage />} />
        </Route>

        <Route path="patents">
          <Route index element={<PatentsListPage />} />
          <Route path="create" element={<PatentCreatePage />} />
          <Route path=":patentId/edit" element={<PatentEditPage />} />
          <Route path=":patentId" element={<PatentDetailsPage />}>
            <Route index element={<PatentMainInfoTab />} />
            <Route path="files" element={<EntityFilesTab entityType="patent" patentFileSections />} />
            <Route path="comments" element={<CommentsList entityType="patent" />} />
            <Route path="grants" element={<PatentGrantsListPage />} />
          </Route>
        </Route>

        <Route path="patent-areas">
          <Route index element={<PatentAreasListPage />} />
        </Route>

        <Route path="patent-grants">
          <Route index element={<PatentGrantsRegistryPage />} />
          <Route path="create" element={<PatentGrantCreatePage />} />
          <Route path=":grantId/edit" element={<PatentGrantEditPage />} />
          <Route path=":grantId" element={<PatentGrantDetailsPage />}>
            <Route index element={<PatentGrantMainInfoTab />} />
            <Route path="files" element={<EntityFilesTab entityType="grant" />} />
          </Route>
        </Route>

        <Route path="partners">
          <Route index element={<PartnersListPage />} />
          <Route path="create" element={<PartnerCreatePage />} />
          <Route path=":partnerId/edit" element={<PartnerEditPage />} />
          <Route path=":partnerId" element={<PartnerDetailsPage />}>
            <Route index element={<PartnerMainInfoTab />} />

            <Route path="contacts" element={<PartnerContactsListPage />} />
            <Route path="contracts" element={<ContractsListPage />} />
            <Route path="evaluations" element={<PartnerEvaluationsTab />} />
            <Route path="comments" element={<CommentsList entityType="partner" />} />
            <Route path="files" element={<EntityFilesTab entityType="partner" />} />
            <Route path="verification" element={<PartnerVerificationTab />} />
          </Route>
        </Route>

        <Route path="supplier-evaluations" element={<SupplierEvaluationsRegistryPage />} />

        <Route path="contracts">
          <Route index element={<ContractsListPage />} />
          <Route path="create" element={<ContractCreatePage />} />
          <Route path=":contractId/edit" element={<ContractEditPage />} />
          <Route path=":contractId" element={<ContractDetailsPage />}>
            <Route index element={<ContractMainInfoTab />} />
            <Route path="additional-agreements" element={<ContractAdditionalAgreementsTab />} />
            <Route path="files" element={<EntityFilesTab entityType="contract" />} />
            <Route path="history" element={<ContractHistoryTab />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Suspense fallback={suspenseFallback}>
            <NotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}
