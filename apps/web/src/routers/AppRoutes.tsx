import { Routes, Route } from "react-router-dom";

import CommentsList from "../components/comments/CommentsList";
import { EntityFilesTab } from "../components/entityFiles/EntityFilesTab";
import MainLayout from "../layouts/MainLayout";
import LoginPage from "../pages/auth/LoginPage";
import ProjectEditPage from "../pages/referenceBooks/projects/ProjectEditPage";
import ProjectCreatePage from "../pages/referenceBooks/projects/ProjectCreatePage";
import PartnersListPage from "../pages/partners/PartnersListPage";
import PartnerDetailsPage from "../pages/partners/PartnerDetailsPage";
import PartnerCreatePage from "../pages/partners/PartnerCreatePage";
import PartnerEditPage from "../pages/partners/PartnersEditPage";
import PartnerContactsListPage from "../pages/partners/detailsTabs/Contacts/ContactsListPage";
import { PartnerMainInfoTab } from "../pages/partners/detailsTabs/PartnerMainInfo";
import PartnerVerificationTab from "../pages/partners/detailsTabs/PartnerVerificationTab";
import PartnerEvaluationsTab from "../pages/partners/evaluations/PartnerEvaluationsTab";
import SupplierEvaluationsRegistryPage from "../pages/supplierEvaluations/SupplierEvaluationsRegistryPage";
import PartnerTypesListPage from "../pages/referenceBooks/partnerTypes/PartnerTypesListPage";
import PartnerStatusesListPage from "../pages/referenceBooks/partnerStatuses/PartnerStatusesListPage";
import ContractsListPage from "../pages/contracts/list/ContractsListPage";
import ContractCreatePage from "../pages/contracts/create/ContractCreatePage";
import ContractDetailsPage from "../pages/contracts/details/ContractDetailsPage";
import ContractEditPage from "../pages/contracts/edit/ContractEditPage";
import PartnerCompetencesListPage from "../pages/referenceBooks/competencies/CompetenciesListPage";
import PartnerCompetenceCreatePage from "../pages/referenceBooks/competencies/CompetenceCreatePage";
import PartnerCompetenceEditPage from "../pages/referenceBooks/competencies/CompetencyEditPage";
import { ContractMainInfoTab } from "../pages/contracts/details/tabs/main/ContractMainInfoTab";
import { ContractAdditionalAgreementsTab } from "../pages/contracts/details/tabs/additionalAgreements/ContractAdditionalAgreementsTab";
import { ContractHistoryTab } from "../pages/contracts/details/tabs/history/ContractHistoryTab";
import PatentCreatePage from "../pages/patents/PatentCreatePage";
import PatentEditPage from "../pages/patents/PatentEditPage";
import PatentDetailsPage from "../pages/patents/PatentDetailsPage";
import { PatentMainInfoTab } from "../pages/patents/detailsTabs/PatentMainInfoTab";
import PartnerEconomicCategoriesListPage from "../pages/referenceBooks/partnerEconomicCategories/EconomicCategoriesListPage";
import ContractTypesListPage from "../pages/referenceBooks/contractTypes/ContractTypesListPage";
import PatentGrantsListPage from "../pages/referenceBooks/patentGrants/PatentGrantsListPage";
import PatentGrantCreatePage from "../pages/referenceBooks/patentGrants/PatentGrantCreatePage";
import PatentGrantEditPage from "../pages/referenceBooks/patentGrants/PatentGrantEditPage";
import PatentGrantDetailsPage from "../pages/referenceBooks/patentGrants/PatentGrantDetailsPage";
import { PatentGrantMainInfoTab } from "../pages/referenceBooks/patentGrants/detailsTabs/PatentGrantMainInfoTab";
import PatentAreasListPage from "../pages/referenceBooks/patentAreas/PatentAreasListPage";
import GanttsPage from "../pages/gantt/GanttsPage";
import HomePage from "../pages/home/HomePage";
import NotFound from "../pages/NotFound";
import PatentsListPage from "../pages/patents/PatentsListPage";
import ProfilePage from "../pages/profile/Profile";
import DepartmentCreatePage from "../pages/referenceBooks/departaments/DepartmentCreatePage";
import DepartmentDetailsPage from "../pages/referenceBooks/departaments/DepartmentDetailsPage";
import DepartmentEditPage from "../pages/referenceBooks/departaments/DepartmentEditPage";
import DepartmentsListPage from "../pages/referenceBooks/departaments/DepartmentsListPage";
import PositionsListPage from "../pages/referenceBooks/positions/PositionsListPage";
import ProjectDetailsPage from "../pages/referenceBooks/projects/ProjectDetailsPage";
import ProjectsListPage from "../pages/referenceBooks/projects/ProjectsListPage";
import UserCreatePage from "../pages/referenceBooks/users/UserCreatePage";
import UserDetailsPage from "../pages/referenceBooks/users/UserDetailsPage";
import UserEditPage from "../pages/referenceBooks/users/UserEditPage";
import UsersListPage from "../pages/referenceBooks/users/UsersListPage";

import PrivateRoute from "./PrivateRoute";

const Private = ({ children }: {
    children: React.ReactNode;
}) => (<PrivateRoute>{children}</PrivateRoute>);
export default function AppRoutes() {
    return (<Routes>
      <Route path="/auth" element={<LoginPage />}/>

      <Route path="/" element={<Private><MainLayout /></Private>}>
        <Route index element={<HomePage />}/>
        <Route path="home" element={<HomePage />}/>
        <Route path="profile" element={<ProfilePage />}/>
        <Route path="users">
          <Route index element={<UsersListPage />}/>
          <Route path="create" element={<UserCreatePage />}/>
          <Route path=":userId/edit" element={<UserEditPage />}/>
          <Route path=":userId" element={<UserDetailsPage />}/>
        </Route>

        <Route path="departments">
          <Route index element={<DepartmentsListPage />}/>
          <Route path="create" element={<DepartmentCreatePage />}/>
          <Route path=":departmentId/edit" element={<DepartmentEditPage />}/>
          <Route path=":departmentId" element={<DepartmentDetailsPage />}/>
        </Route>

        <Route path="positions">
          <Route index element={<PositionsListPage />}/>
        </Route>

        <Route path="projects">
          <Route index element={<ProjectsListPage />}/>
          <Route path="create" element={<ProjectCreatePage />}/>
          <Route path=":projectId/edit" element={<ProjectEditPage />}/>
          <Route path=":projectId" element={<ProjectDetailsPage />}/>
        </Route>

        <Route path="gantts">
          <Route index element={<GanttsPage />}/>
        </Route>

        <Route path="competencies">
          <Route index element={<PartnerCompetencesListPage />}/>
          <Route path="create" element={<PartnerCompetenceCreatePage />}/>
          <Route path=":competenceId/edit" element={<PartnerCompetenceEditPage />}/>
        </Route>

        <Route path="admin">
          <Route path="partner-types" element={<PartnerTypesListPage />}/>
          <Route path="partner-statuses" element={<PartnerStatusesListPage />}/>
          <Route path="partner-economic-categories" element={<PartnerEconomicCategoriesListPage />}/>
          <Route path="contract-types" element={<ContractTypesListPage />}/>
        </Route>

        <Route path="patents">
          <Route index element={<PatentsListPage />}/>
          <Route path="create" element={<PatentCreatePage />}/>
          <Route path=":patentId/edit" element={<PatentEditPage />}/>
          <Route path=":patentId" element={<PatentDetailsPage />}>
            <Route index element={<PatentMainInfoTab />}/>
            <Route path="files" element={<EntityFilesTab entityType="patent"/>}/>
            <Route path="comments" element={<CommentsList entityType="patent"/>}/>
            <Route path="grants" element={<PatentGrantsListPage />}/>
          </Route>
        </Route>

        <Route path="patent-areas">
          <Route index element={<PatentAreasListPage />}/>
        </Route>

        <Route path="patent-grants">
          <Route index element={<NotFound />}/>
          <Route path="create" element={<PatentGrantCreatePage />}/>
          <Route path=":grantId/edit" element={<PatentGrantEditPage />}/>
          <Route path=":grantId" element={<PatentGrantDetailsPage />}>
            <Route index element={<PatentGrantMainInfoTab />}/>
            <Route path="files" element={<EntityFilesTab entityType="grant"/>}/>
          </Route>
        </Route>

        <Route path="partners">
          <Route index element={<PartnersListPage />}/>
          <Route path="create" element={<PartnerCreatePage />}/>
          <Route path=":partnerId/edit" element={<PartnerEditPage />}/>
          <Route path=":partnerId" element={<PartnerDetailsPage />}>
            <Route index element={<PartnerMainInfoTab />}/>

            <Route path="contacts" element={<PartnerContactsListPage />}/>
            <Route path="contracts" element={<ContractsListPage />}/>
            <Route path="evaluations" element={<PartnerEvaluationsTab />}/>
            <Route path="comments" element={<CommentsList entityType="partner"/>}/>
            <Route path="files" element={<EntityFilesTab entityType="partner"/>}/>
            <Route path="verification" element={<PartnerVerificationTab />}/>
          </Route>
        </Route>

        <Route path="supplier-evaluations" element={<SupplierEvaluationsRegistryPage />}/>

        <Route path="contracts">
          <Route index element={<ContractsListPage />}/>
          <Route path="create" element={<ContractCreatePage />}/>
          <Route path=":contractId/edit" element={<ContractEditPage />}/>
          <Route path=":contractId" element={<ContractDetailsPage />}>
            <Route index element={<ContractMainInfoTab />}/>
            <Route path="additional-agreements" element={<ContractAdditionalAgreementsTab />}/>
            <Route path="files" element={<EntityFilesTab entityType="contract" />}/>
            <Route path="history" element={<ContractHistoryTab />}/>
          </Route>
        </Route>


      </Route>

      <Route path="*" element={<NotFound />}/>
    </Routes>);
}
