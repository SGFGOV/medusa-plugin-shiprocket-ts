export interface InternationalCourierServiceabilityResponse {
    status: number;
    data: Data;
}

export interface Data {
    is_recommendation_enabled: boolean;
    recommended_courier_company_id: number;
    recommended_by: RecommendedBy;
    available_courier_companies: AvailableCourierCompany[];
}

export interface RecommendedBy {
    id: number;
    title: string;
}

export interface AvailableCourierCompany {
    courier_company_id: number;
    courier_name: string;
    rate: Rate;
}

export interface Rate {
    rate: string;
    weight: string;
}
