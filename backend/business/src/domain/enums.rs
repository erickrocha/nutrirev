use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;
use utoipa::ToSchema;

#[derive(Clone, Eq, PartialEq, Debug, Default, Serialize, Deserialize, ToSchema)]
pub enum Role {
    SysAdmin,
    TenantOwner,
    TenantUser,
    #[default]
    User,
}

impl Display for Role {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::SysAdmin => write!(f, "SysAdmin"),
            Role::TenantOwner => write!(f, "TenantOwner"),
            Role::TenantUser => write!(f, "TenantUser"),
            Role::User => write!(f, "User"),
        }
    }
}

impl FromStr for Role {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim() {
            "SysAdmin" => Ok(Self::SysAdmin),
            "TenantOwner" => Ok(Self::TenantOwner),
            "TenantUser" => Ok(Self::TenantUser),
            "User" => Ok(Self::User),
            _ => Err(format!("Invalid recommended period: {}", value))?,
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug)]
pub enum MeasurementUnit {
    Grams,
    Kg,
    Ml,
    Liter,
    Units,
    Cup,
    TableSpoon,
    TeaSpoon,
    CoffeeSpoon,
    DessertSpoon,
    Pinch,
    Slice,
    Shell,
    Glass,
    LittleSquares,
    Scoop,
}

impl Display for MeasurementUnit {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MeasurementUnit::Grams => write!(f, "Grams"),
            MeasurementUnit::Kg => write!(f, "Kg"),
            MeasurementUnit::Ml => write!(f, "Ml"),
            MeasurementUnit::Liter => write!(f, "Liter"),
            MeasurementUnit::Units => write!(f, "Units"),
            MeasurementUnit::Cup => write!(f, "Cup"),
            MeasurementUnit::TableSpoon => write!(f, "TableSpoon"),
            MeasurementUnit::TeaSpoon => write!(f, "TeaSpoon"),
            MeasurementUnit::CoffeeSpoon => write!(f, "CoffeeSpoon"),
            MeasurementUnit::DessertSpoon => write!(f, "DessertSpoon"),
            MeasurementUnit::Pinch => write!(f, "Pinch"),
            MeasurementUnit::Slice => write!(f, "Slice"),
            MeasurementUnit::Shell => write!(f, "Shell"),
            MeasurementUnit::Glass => write!(f, "Glass"),
            MeasurementUnit::LittleSquares => write!(f, "LittleSquares"),
            MeasurementUnit::Scoop => write!(f, "Scoop"),
        }
    }
}

impl FromStr for MeasurementUnit {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let v = value.trim();
        if v.eq_ignore_ascii_case("Grams") {
            Ok(MeasurementUnit::Grams)
        } else if v.eq_ignore_ascii_case("Kg") {
            Ok(MeasurementUnit::Kg)
        } else if v.eq_ignore_ascii_case("Ml") {
            Ok(MeasurementUnit::Ml)
        } else if v.eq_ignore_ascii_case("Liter") {
            Ok(MeasurementUnit::Liter)
        } else if v.eq_ignore_ascii_case("Units") {
            Ok(MeasurementUnit::Units)
        } else if v.eq_ignore_ascii_case("Cup") {
            Ok(MeasurementUnit::Cup)
        } else if v.eq_ignore_ascii_case("TableSpoon") || v.eq_ignore_ascii_case("Tablespoon") {
            Ok(MeasurementUnit::TableSpoon)
        } else if v.eq_ignore_ascii_case("TeaSpoon") || v.eq_ignore_ascii_case("Teaspoon") {
            Ok(MeasurementUnit::TeaSpoon)
        } else if v.eq_ignore_ascii_case("CoffeeSpoon") || v.eq_ignore_ascii_case("Coffeespoon") {
            Ok(MeasurementUnit::CoffeeSpoon)
        } else if v.eq_ignore_ascii_case("DessertSpoon") || v.eq_ignore_ascii_case("Dessertspoon") {
            Ok(MeasurementUnit::DessertSpoon)
        } else if v.eq_ignore_ascii_case("Pinch") {
            Ok(MeasurementUnit::Pinch)
        } else if v.eq_ignore_ascii_case("Slice") {
            Ok(MeasurementUnit::Slice)
        } else if v.eq_ignore_ascii_case("Shell") {
            Ok(MeasurementUnit::Shell)
        } else if v.eq_ignore_ascii_case("Glass") {
            Ok(MeasurementUnit::Glass)
        } else if v.eq_ignore_ascii_case("LittleSquares") || v.eq_ignore_ascii_case("Littlesquares") {
            Ok(MeasurementUnit::LittleSquares)
        } else if v.eq_ignore_ascii_case("Scoop") {
            Ok(MeasurementUnit::Scoop)
        } else {
            Err(format!("Invalid measure unit: {}", value))
        }
    }
}

impl MeasurementUnit {
    /// Conversion multiplier relative to standard base unit (g/ml/unit)
    pub fn gram_multiplier(&self) -> f64 {
        match self {
            MeasurementUnit::Grams => 1.0,
            MeasurementUnit::Kg => 1000.0,
            MeasurementUnit::Ml => 1.0,
            MeasurementUnit::Liter => 1000.0,
            MeasurementUnit::Units => 1.0,
            MeasurementUnit::Cup => 120.0,
            MeasurementUnit::TableSpoon => 15.0,
            MeasurementUnit::TeaSpoon => 5.0,
            MeasurementUnit::CoffeeSpoon => 2.5,
            MeasurementUnit::DessertSpoon => 10.0,
            MeasurementUnit::Pinch => 0.5,
            MeasurementUnit::Slice => 30.0,
            MeasurementUnit::Shell => 100.0,
            MeasurementUnit::Glass => 200.0,
            MeasurementUnit::LittleSquares => 10.0,
            MeasurementUnit::Scoop => 30.0,
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug, Default)]
pub enum RecommendedPeriod {
    #[default]
    Weekly,
    Monthly,
}

impl Display for RecommendedPeriod {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            RecommendedPeriod::Weekly => write!(f, "Weekly"),
            RecommendedPeriod::Monthly => write!(f, "Monthly"),
        }
    }
}

impl FromStr for RecommendedPeriod {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim() {
            "Weekly" => Ok(Self::Weekly),
            "Monthly" => Ok(Self::Monthly),
            _ => Err(format!("Invalid recommended period: {}", value))?,
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug, Serialize, Deserialize, Default)]
pub enum MealPlanCategory {
    LoseWeight,
    #[default]
    KeepFit,
    EarnWeight,
    Hypocaloric,
    Hypertrophy,
    Maintenance,
    Ketogenic,
    LowCarb,
}

impl Display for MealPlanCategory {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            MealPlanCategory::LoseWeight => "LoseWeight",
            MealPlanCategory::KeepFit => "KeepFit",
            MealPlanCategory::EarnWeight => "EarnWeight",
            MealPlanCategory::Hypocaloric => "Hypocaloric",
            MealPlanCategory::Hypertrophy => "Hypertrophy",
            MealPlanCategory::Maintenance => "Maintenance",
            MealPlanCategory::Ketogenic => "Ketogenic",
            MealPlanCategory::LowCarb => "LowCarb",
        };
        write!(f, "{value}")
    }
}

impl FromStr for MealPlanCategory {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim() {
            "LoseWeight" => Ok(Self::LoseWeight),
            "KeepFit" => Ok(Self::KeepFit),
            "EarnWeight" => Ok(Self::EarnWeight),
            "Hypocaloric" => Ok(Self::Hypocaloric),
            "Hypertrophy" => Ok(Self::Hypertrophy),
            "Maintenance" => Ok(Self::Maintenance),
            "Ketogenic" => Ok(Self::Ketogenic),
            "LowCarb" => Ok(Self::LowCarb),
            _ => Err(format!("Invalid meal-plan category: {value}")),
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug, Serialize, Deserialize, Default)]
pub enum MealPlanGenerationStatus {
    #[default]
    Draft,
    Finished,
}

impl Display for MealPlanGenerationStatus {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MealPlanGenerationStatus::Draft => write!(f, "Draft"),
            MealPlanGenerationStatus::Finished => write!(f, "Finished"),
        }
    }
}

impl FromStr for MealPlanGenerationStatus {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim() {
            "Draft" => Ok(MealPlanGenerationStatus::Draft),
            "Finished" => Ok(MealPlanGenerationStatus::Finished),
            _ => Err(format!("Invalid meal-plan generation status: {value}")),
        }
    }
}

#[derive(Clone, Eq, PartialEq, Debug, Serialize, Deserialize)]
pub enum MealType {
    Breakfast,
    MorningSnack,
    Lunch,
    Snack,
    Dinner,
    Supper,
    PreWorkout,
    PostWorkout,
}

impl Display for MealType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MealType::Breakfast => write!(f, "Breakfast"),
            MealType::MorningSnack => write!(f, "MorningSnack"),
            MealType::Lunch => write!(f, "Lunch"),
            MealType::Snack => write!(f, "Snack"),
            MealType::Dinner => write!(f, "Dinner"),
            MealType::Supper => write!(f, "Supper"),
            MealType::PreWorkout => write!(f, "PreWorkout"),
            MealType::PostWorkout => write!(f, "PostWorkout"),
        }
    }
}

impl FromStr for MealType {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim() {
            "Breakfast" => Ok(MealType::Breakfast),
            "MorningSnack" => Ok(MealType::MorningSnack),
            "Lunch" => Ok(MealType::Lunch),
            "Snack" => Ok(MealType::Snack),
            "Dinner" => Ok(MealType::Dinner),
            "Supper" => Ok(MealType::Supper),
            "PreWorkout" => Ok(MealType::PreWorkout),
            "PostWorkout" => Ok(MealType::PostWorkout),
            _ => Err(format!("Invalid meal type: {value}")),
        }
    }
}

#[derive(Clone, Copy, Eq, PartialEq, Debug, Serialize, Deserialize, ToSchema, Default)]
pub enum AnalysisType {
    #[serde(rename = "MANUAL")]
    #[default]
    Manual,
    #[serde(rename = "AI_ANALYZE")]
    AiAnalyze,
}

impl Display for AnalysisType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            AnalysisType::Manual => write!(f, "MANUAL"),
            AnalysisType::AiAnalyze => write!(f, "AI_ANALYZE"),
        }
    }
}

impl FromStr for AnalysisType {
    type Err = String;
    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_uppercase().as_str() {
            "MANUAL" => Ok(AnalysisType::Manual),
            "AI_ANALYZE" | "AIANALYZE" | "AI" => Ok(AnalysisType::AiAnalyze),
            _ => Err(format!("Invalid analysis type: {value}")),
        }
    }
}

#[cfg(test)]
mod meal_plan_generation_status_tests {
    use super::{
        AnalysisType, MealPlanCategory, MealPlanGenerationStatus, MealType, MeasurementUnit,
        RecommendedPeriod, Role,
    };
    use std::fmt::{Debug, Display};
    use std::str::FromStr;

    fn assert_round_trip<T>(values: Vec<T>)
    where
        T: Debug + Display + FromStr + PartialEq,
        <T as FromStr>::Err: Debug,
    {
        for value in values {
            let code = value.to_string();
            assert_eq!(code.parse::<T>().unwrap(), value, "code: {code}");
        }
    }

    #[test]
    fn displays_canonical_english_values() {
        assert_eq!(MealPlanGenerationStatus::Draft.to_string(), "Draft");
        assert_eq!(MealPlanGenerationStatus::Finished.to_string(), "Finished");
    }

    #[test]
    fn parses_supported_values_case_insensitively() {
        assert_eq!(
            " Draft ".parse::<MealPlanGenerationStatus>(),
            Ok(MealPlanGenerationStatus::Draft)
        );
        assert_eq!(
            "Finished".parse::<MealPlanGenerationStatus>(),
            Ok(MealPlanGenerationStatus::Finished)
        );
    }

    #[test]
    fn rejects_unknown_values() {
        assert!("active".parse::<MealPlanGenerationStatus>().is_err());
    }

    #[test]
    fn meal_plan_categories_use_canonical_english_codes() {
        assert_eq!(MealPlanCategory::EarnWeight.to_string(), "EarnWeight");
        assert_eq!("LowCarb".parse(), Ok(MealPlanCategory::LowCarb));
        assert!("Hipocalórico".parse::<MealPlanCategory>().is_err());
    }

    #[test]
    fn every_business_enum_value_round_trips_through_its_canonical_code() {
        assert_round_trip(vec![
            Role::SysAdmin,
            Role::TenantOwner,
            Role::TenantUser,
            Role::User,
        ]);
        assert_round_trip(vec![
            MeasurementUnit::Grams,
            MeasurementUnit::Kg,
            MeasurementUnit::Ml,
            MeasurementUnit::Liter,
            MeasurementUnit::Units,
            MeasurementUnit::Cup,
            MeasurementUnit::TableSpoon,
            MeasurementUnit::TeaSpoon,
            MeasurementUnit::CoffeeSpoon,
            MeasurementUnit::DessertSpoon,
            MeasurementUnit::Pinch,
            MeasurementUnit::Slice,
            MeasurementUnit::Shell,
            MeasurementUnit::Glass,
            MeasurementUnit::LittleSquares,
            MeasurementUnit::Scoop,
        ]);
        assert_round_trip(vec![RecommendedPeriod::Weekly, RecommendedPeriod::Monthly]);
        assert_round_trip(vec![
            MealPlanCategory::LoseWeight,
            MealPlanCategory::KeepFit,
            MealPlanCategory::EarnWeight,
            MealPlanCategory::Hypocaloric,
            MealPlanCategory::Hypertrophy,
            MealPlanCategory::Maintenance,
            MealPlanCategory::Ketogenic,
            MealPlanCategory::LowCarb,
        ]);
        assert_round_trip(vec![
            MealPlanGenerationStatus::Draft,
            MealPlanGenerationStatus::Finished,
        ]);
        assert_round_trip(vec![
            MealType::Breakfast,
            MealType::MorningSnack,
            MealType::Lunch,
            MealType::Snack,
            MealType::Dinner,
            MealType::Supper,
            MealType::PreWorkout,
            MealType::PostWorkout,
        ]);
        assert_round_trip(vec![AnalysisType::Manual, AnalysisType::AiAnalyze]);
    }
}
