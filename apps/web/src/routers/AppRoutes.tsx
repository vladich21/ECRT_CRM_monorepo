import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import { Loader } from '../components/loader/Loader';
import { RequireSection } from '../components/canAccess/RequireSection';
import MainLayout from '../layouts/MainLayout';
import { SECTIONS, type SectionCode } from '../shared/permissions';

import PrivateRoute from './PrivateRoute';
import { PARTNER_FILE_SECTIONS } from '../pages/partners/partnerFileSections';

const CommentsList = lazy(() => import('../components/comments/CommentsList'));
const EntityFilesTab = lazy(() =>
  import('../components/entityFiles/EntityFilesTab').then(m => ({ default: m.EntityFilesTab })),
);
const ApprovalPanel = lazy(() =>
  import('../components/approvals/ApprovalPanel').then(m => ({ default: m.ApprovalPanel })),
);
const MyApprovalsPage = lazy(() => import('../pages/approvals/MyApprovalsPage'));
const ApprovalRoutesListPage = lazy(() => import('../pages/approvals/routes/ApprovalRoutesListPage'));
const ApprovalRouteFormPage = lazy(() => import('../pages/approvals/routes/ApprovalRouteFormPage'));

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
const PartnerEvaluationReportPage = lazy(() => import('../pages/partners/evaluations/PartnerEvaluationReportPage'));
const SupplierEvaluationsRegistryPage = lazy(() => import('../pages/supplierEvaluations/SupplierEvaluationsRegistryPage'));
const PurchaseRequestsListPage = lazy(() => import('../pages/procurement/requests/PurchaseRequestsListPage'));
const PurchaseRequestCreatePage = lazy(() => import('../pages/procurement/requests/PurchaseRequestCreatePage'));
const PurchaseRequestCardPage = lazy(() => import('../pages/procurement/requests/PurchaseRequestCardPage'));
const PurchaseRequestEditPage = lazy(() => import('../pages/procurement/requests/PurchaseRequestEditPage'));
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
const DepartmentsListPage = lazy(() => import('../pages/referenceBooks/departments/DepartmentsListPage'));
const PositionsListPage = lazy(() => import('../pages/referenceBooks/positions/PositionsListPage'));
const ProjectDetailsPage = lazy(() => import('../pages/referenceBooks/projects/ProjectDetailsPage'));
const ProjectDetailsMainTab = lazy(() => import('../pages/referenceBooks/projects/tabs/ProjectDetailsMainTab'));
const ProjectDocumentsTab = lazy(() => import('../pages/referenceBooks/projects/tabs/ProjectDocumentsTab'));
const ProjectsListPage = lazy(() => import('../pages/referenceBooks/projects/ProjectsListPage'));
const UserDetailsPage = lazy(() => import('../pages/referenceBooks/users/UserDetailsPage'));
const UsersListPage = lazy(() => import('../pages/referenceBooks/users/UsersListPage'));
const RolesListPage = lazy(() => import('../pages/admin/roles/RolesListPage'));
const SwStructurePage = lazy(() => import('../pages/swRegistry/SwStructurePage'));
const SwItemsListPage = lazy(() => import('../pages/swRegistry/items/SwItemsListPage'));
const SwSummaryPage = lazy(() => import('../pages/swRegistry/summary/SwSummaryPage'));

const Private = ({ children }: { children: React.ReactNode }) => <PrivateRoute>{children}</PrivateRoute>;

const Guarded = ({ section, children }: { section: SectionCode; children: React.ReactNode }) => (
  <RequireSection section={section} action="read">{children}</RequireSection>
);

/** Карточка программы и страница документа реестра ПО заменены панелью в дереве: старые адреса ведут туда. */
const RedirectSwItemToStructure = () => {
  const { itemId, documentId } = useParams();
  const params = new URLSearchParams();
  if (itemId) params.set('itemId', itemId);
  if (documentId) params.set('documentId', documentId);
  return <Navigate to={`/sw/structure?${params}`} replace />;
};

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
        <Route path="my-approvals" element={<MyApprovalsPage />} />
        <Route path="users">
          <Route index element={<Guarded section={SECTIONS.ADMIN_USERS}><UsersListPage /></Guarded>} />
          <Route path="create" element={<RedirectToUsersList />} />
          <Route path=":userId/edit" element={<RedirectUserEditToDetails />} />
          <Route path=":userId" element={<Guarded section={SECTIONS.ADMIN_USERS}><UserDetailsPage /></Guarded>} />
        </Route>

        <Route path="departments">
          <Route index element={<Guarded section={SECTIONS.REFERENCES_DEPARTMENTS}><DepartmentsListPage /></Guarded>} />
          <Route path="create" element={<Navigate to="/departments" replace />} />
          <Route path=":departmentId/edit" element={<Navigate to="/departments" replace />} />
          <Route path=":departmentId" element={<Navigate to="/departments" replace />} />
        </Route>

        <Route path="positions">
          <Route index element={<Guarded section={SECTIONS.REFERENCES_POSITIONS}><PositionsListPage /></Guarded>} />
        </Route>

        <Route path="projects">
          <Route index element={<Guarded section={SECTIONS.PROJECTS_LIST}><ProjectsListPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.PROJECTS_LIST}><ProjectCreatePage /></Guarded>} />
          <Route path=":projectId/edit" element={<Guarded section={SECTIONS.PROJECTS_LIST}><ProjectEditPage /></Guarded>} />
          <Route path=":projectId" element={<Guarded section={SECTIONS.PROJECTS_LIST}><ProjectDetailsPage /></Guarded>}>
            <Route index element={<ProjectDetailsMainTab />} />
            <Route path="project-documents" element={<ProjectDocumentsTab />} />
          </Route>
        </Route>

        <Route path="gantts">
          <Route index element={<Guarded section={SECTIONS.PROJECTS_GANTT}><GanttsPage /></Guarded>} />
        </Route>

        <Route path="competencies">
          <Route index element={<Guarded section={SECTIONS.REFERENCES_COMPETENCIES}><PartnerCompetencesListPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.REFERENCES_COMPETENCIES}><PartnerCompetenceCreatePage /></Guarded>} />
          <Route path=":competenceId/edit" element={<Guarded section={SECTIONS.REFERENCES_COMPETENCIES}><PartnerCompetenceEditPage /></Guarded>} />
        </Route>

        <Route path="admin">
          <Route path="roles" element={<Guarded section={SECTIONS.ADMIN_ROLES}><RolesListPage /></Guarded>} />
          <Route path="approval-routes" element={<Guarded section={SECTIONS.ADMIN_APPROVAL_ROUTES}><ApprovalRoutesListPage /></Guarded>} />
          <Route path="approval-routes/create" element={<Guarded section={SECTIONS.ADMIN_APPROVAL_ROUTES}><ApprovalRouteFormPage /></Guarded>} />
          <Route path="approval-routes/:routeId/edit" element={<Guarded section={SECTIONS.ADMIN_APPROVAL_ROUTES}><ApprovalRouteFormPage /></Guarded>} />
          <Route path="partner-types" element={<Guarded section={SECTIONS.REFERENCES_PARTNER_TYPES}><PartnerTypesListPage /></Guarded>} />
          <Route path="partner-statuses" element={<Guarded section={SECTIONS.REFERENCES_PARTNER_STATUSES}><PartnerStatusesListPage /></Guarded>} />
          <Route path="partner-economic-categories" element={<Guarded section={SECTIONS.REFERENCES_PARTNER_ECONOMIC}><PartnerEconomicCategoriesListPage /></Guarded>} />
          <Route path="contract-types" element={<Guarded section={SECTIONS.REFERENCES_CONTRACT_TYPES}><ContractTypesListPage /></Guarded>} />
        </Route>

        <Route path="patents">
          <Route index element={<Guarded section={SECTIONS.PATENTS_LIST}><PatentsListPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.PATENTS_LIST}><PatentCreatePage /></Guarded>} />
          <Route path=":patentId/edit" element={<Guarded section={SECTIONS.PATENTS_LIST}><PatentEditPage /></Guarded>} />
          <Route path=":patentId" element={<Guarded section={SECTIONS.PATENTS_LIST}><PatentDetailsPage /></Guarded>}>
            <Route index element={<PatentMainInfoTab />} />
            <Route path="files" element={<EntityFilesTab entityType="patent" patentFileSections />} />
            <Route path="comments" element={<CommentsList entityType="patent" />} />
            <Route path="grants" element={<PatentGrantsListPage />} />
          </Route>
        </Route>

        <Route path="patent-areas">
          <Route index element={<Guarded section={SECTIONS.REFERENCES_PATENT_AREAS}><PatentAreasListPage /></Guarded>} />
        </Route>

        <Route path="patent-grants">
          <Route index element={<Guarded section={SECTIONS.PATENTS_GRANTS}><PatentGrantsRegistryPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.PATENTS_GRANTS}><PatentGrantCreatePage /></Guarded>} />
          <Route path=":grantId/edit" element={<Guarded section={SECTIONS.PATENTS_GRANTS}><PatentGrantEditPage /></Guarded>} />
          <Route path=":grantId" element={<Guarded section={SECTIONS.PATENTS_GRANTS}><PatentGrantDetailsPage /></Guarded>}>
            <Route index element={<PatentGrantMainInfoTab />} />
            <Route path="files" element={<EntityFilesTab entityType="grant" />} />
          </Route>
        </Route>

        <Route path="partners">
          <Route index element={<Guarded section={SECTIONS.PARTNERS_LIST}><PartnersListPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.PARTNERS_LIST}><PartnerCreatePage /></Guarded>} />
          <Route path=":partnerId/edit" element={<Guarded section={SECTIONS.PARTNERS_LIST}><PartnerEditPage /></Guarded>} />
          <Route
            path=":partnerId/evaluation-report"
            element={
              <Guarded section={SECTIONS.PARTNERS_LIST}>
                <Suspense fallback={suspenseFallback}>
                  <PartnerEvaluationReportPage />
                </Suspense>
              </Guarded>
            }
          />
          <Route path=":partnerId" element={<Guarded section={SECTIONS.PARTNERS_LIST}><PartnerDetailsPage /></Guarded>}>
            <Route index element={<PartnerMainInfoTab />} />

            <Route path="contacts" element={<PartnerContactsListPage />} />
            <Route path="contracts" element={<ContractsListPage />} />
            <Route path="evaluations" element={<PartnerEvaluationsTab />} />
            <Route path="comments" element={<CommentsList entityType="partner" />} />
            <Route
              path="files"
              element={
                <EntityFilesTab entityType="partner" documentSections={PARTNER_FILE_SECTIONS} />
              }
            />
            <Route path="verification" element={<PartnerVerificationTab />} />
          </Route>
        </Route>

        <Route path="procurement/requests" element={<Guarded section={SECTIONS.PROCUREMENT_REQUESTS}><PurchaseRequestsListPage /></Guarded>} />
        <Route path="procurement/requests/create" element={<Guarded section={SECTIONS.PROCUREMENT_REQUESTS}><PurchaseRequestCreatePage /></Guarded>} />
        <Route path="procurement/requests/:requestId/edit" element={<Guarded section={SECTIONS.PROCUREMENT_REQUESTS}><PurchaseRequestEditPage /></Guarded>} />
        <Route path="procurement/requests/:requestId" element={<PurchaseRequestCardPage />} />
        <Route path="supplier-evaluations" element={<Guarded section={SECTIONS.PARTNERS_EVALUATIONS}><SupplierEvaluationsRegistryPage /></Guarded>} />

        <Route path="contracts">
          <Route index element={<Guarded section={SECTIONS.CONTRACTS_LIST}><ContractsListPage /></Guarded>} />
          <Route path="create" element={<Guarded section={SECTIONS.CONTRACTS_LIST}><ContractCreatePage /></Guarded>} />
          <Route path=":contractId/edit" element={<Guarded section={SECTIONS.CONTRACTS_LIST}><ContractEditPage /></Guarded>} />
          <Route path=":contractId" element={<Guarded section={SECTIONS.CONTRACTS_LIST}><ContractDetailsPage /></Guarded>}>
            <Route index element={<ContractMainInfoTab />} />
            <Route path="additional-agreements" element={<ContractAdditionalAgreementsTab />} />
            <Route path="approval" element={<ApprovalPanel entityType="contract" />} />
            <Route path="files" element={<EntityFilesTab entityType="contract" />} />
            <Route path="history" element={<ContractHistoryTab />} />
          </Route>
        </Route>

        <Route path="sw">
          <Route index element={<Navigate to="/sw/items" replace />} />
          <Route path="structure" element={<Guarded section={SECTIONS.SW_STRUCTURE}><SwStructurePage /></Guarded>} />
          <Route path="items" element={<Guarded section={SECTIONS.SW_ITEMS}><SwItemsListPage /></Guarded>} />
          <Route path="items/:itemId" element={<RedirectSwItemToStructure />} />
          <Route path="items/:itemId/documents/:documentId" element={<RedirectSwItemToStructure />} />
          <Route path="summary" element={<Guarded section={SECTIONS.SW_SUMMARY}><SwSummaryPage /></Guarded>} />
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
