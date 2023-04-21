export type ViewDimensions = {
    svgWidth: number,
    svgHeight: number,
    margin: {
        top: number,
        right: number,
        bottom: number,
        left: number
    }
};

export type HourlyIrradianceByMonth = {
    northWest: number[][],
    northEast: number[][]
};

export type HourlyUsageByMonth = HourlyUsageValue[][];

export type HourlyUsageValue = {
    phase1: number,
    phase2: number,
    phase3: number,
    cylinder: number
};

export type SummableMeasurement<TData> = {
    totalUsageKWh: TData,
    controlledGridUsageKWh: TData,
    phase1GridUsageKWh: TData,
    phase2GridUsageKWh: TData,
    phase3GridUsageKWh: TData,
    phase1SolarUsageKWh: TData,
    phase2SolarUsageKWh: TData,
    phase3SolarUsageKWh: TData,
    phase1ExportedKWh: TData,
    phase2ExportedKWh: TData,
    phase3ExportedKWh: TData,
    batteryUsageKWh: TData,
    generationKWh: TData,
    batteryStoredKWh: TData
};

export type NonSummableMeasurement<TData> = {
    batteryLevelKWh: TData
};

export type AllMeasurements<TData> = SummableMeasurement<TData> & NonSummableMeasurement<TData>;

export type SummableHourlyMeasurementsByMonth = SummableMeasurement<number[][]>;

export type HourlyMeasurementsByMonth = AllMeasurements<number[][]>;

export type HourlyMeasurementsForSingleMonth = AllMeasurements<number[]>;

export type AnnualMeasurements = SummableMeasurement<number>;

export type NiwaSourceColumns = "Azimuth" | "Cloudless W/m2" | "Cumulative kWh/m2" | "Elevation" | "Hourly W/m2" | "Month & hour";

export type PowershopUsageColumns = "ICP" | "Meter number" | "Meter element" | "Date" | "00:00 - 00:30" | "00:30 - 01:00" | "01:00 - 01:30" | "01:30 - 02:00" | "02:00 - 02:30" | "02:30 - 03:00" | "03:00 - 03:30" | "03:30 - 04:00" | "04:00 - 04:30" | "04:30 - 05:00" | "05:00 - 05:30" | "05:30 - 06:00" | "06:00 - 06:30" | "06:30 - 07:00" | "07:00 - 07:30" | "07:30 - 08:00" | "08:00 - 08:30" | "08:30 - 09:00" | "09:00 - 09:30" | "09:30 - 10:00" | "10:00 - 10:30" | "10:30 - 11:00" | "11:00 - 11:30" | "11:30 - 12:00" | "12:00 - 12:30" | "12:30 - 13:00" | "13:00 - 13:30" | "13:30 - 14:00" | "14:00 - 14:30" | "14:30 - 15:00" | "15:00 - 15:30" | "15:30 - 16:00" | "16:00 - 16:30" | "16:30 - 17:00" | "17:00 - 17:30" | "17:30 - 18:00" | "18:00 - 18:30" | "18:30 - 19:00" | "19:00 - 19:30" | "19:30 - 20:00" | "20:00 - 20:30" | "20:30 - 21:00" | "21:00 - 21:30" | "21:30 - 22:00" | "22:00 - 22:30" | "22:30 - 23:00" | "23:00 - 23:30" | "23:30 - 00:00";

export type EcotricityUsageColumns = "Time stamp" | "Phase 1 (kWh)" | "Phase 2 (kWh)" | "Phase 3 (kWh)" | "Controlled (kWh)";

export type SolarConfiguration = {
    northWestNumberOfPanels: number,
    northEastNumberOfPanels: number,
    panelRatingW: number,
    singlePanelAreaSqm: number,
    batteryCapacityKWh: number,
    waterCylinderSource: WaterCylinderSource,
    phaseConfiguration: PhaseConfigurationOption
};

export type PricingConfiguration = {
    gridPricePerUnit: number,
    controlledPricePerUnit: number,
    feedbackPricePerUnit: number,
    installationCost: number
};

export enum WaterCylinderSource {
    Grid,
    Phase1,
    Phase2,
    Phase3
}

export enum PhaseConfigurationOption {
    SinglePhase1Inverter,
    SinglePhase2Inverter,
    SinglePhase3Inverter,
    ThreePhaseInverterEqualDistribution,
    ThreePhaseInverterBalanced
}
