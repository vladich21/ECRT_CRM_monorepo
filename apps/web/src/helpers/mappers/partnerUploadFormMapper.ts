interface CompanyApiResponse {
  inn: string;
  ogrn: string;
  company: {
    kpp: string;
    company_names: {
      short_name: string;
      full_name: string;
      reversed_short_name: string;
    };
    address: {
      line_address: string;
      is_inaccuracy: boolean;
      zip_code: string;
      region_code: string;
    };
  };
}

interface MappedCompanyData {
  name: string;
  short_name: string;
  legal_address: string;
  kpp: string;
  ogrn: string;
  inn: string;
}

export const partnerUploadFormMapper = (data: CompanyApiResponse): MappedCompanyData | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    name: data.company?.company_names?.full_name || '',
    short_name: data.company?.company_names?.short_name || data.company?.company_names?.reversed_short_name || '',
    legal_address: data.company?.address?.line_address || '',
    kpp: data.company?.kpp || '',
    ogrn: data.ogrn || '',
    inn: data.inn,
  };
};
