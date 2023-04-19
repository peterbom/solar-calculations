import { AnnualMeasurements, HourlyIrradianceByMonth, HourlyMeasurementsByMonth, HourlyMeasurementsForSingleMonth, HourlyUsageByMonth, HourlyUsageValue, PhaseConfigurationOption, SolarConfiguration, SummableHourlyMeasurementsByMonth, WaterCylinderSource } from "./types";
import moment from 'moment';
import { getSum } from './stats';

const monthDays = Array.from({length: 12}, (_, i) => moment(new Date(2001, i, 1)).daysInMonth());

export function getHourlyMeasurementsByMonth(
    solarConfiguration: SolarConfiguration,
    hourlyIrradianceByMonth: HourlyIrradianceByMonth,
    hourlyUsageByMonth: HourlyUsageByMonth
): HourlyMeasurementsByMonth {
    const northWestPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northWestNumberOfPanels;
    const northEastPanelArea = solarConfiguration.singlePanelAreaSqm * solarConfiguration.northEastNumberOfPanels;

    const efficiency = getPanelEfficiency(solarConfiguration);

    function getSingleMonthData(monthIndex: number): HourlyMeasurementsForSingleMonth {
        const usage = hourlyUsageByMonth[monthIndex];

        const northWestIrradiance = hourlyIrradianceByMonth.northWest[monthIndex];
        const northEastIrradiance = hourlyIrradianceByMonth.northEast[monthIndex];

        const northWestGeneration = northWestIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northWestPanelArea));
        const northEastGeneration = northEastIrradiance.map(wPerSqm => getGenerationInKWh(wPerSqm, efficiency, northEastPanelArea));
        const generation = Array.from({ length: 24 }, (_, i) => northWestGeneration[i] + northEastGeneration[i]);

        return getHourlyMeasurementsForSingleMonth(solarConfiguration, usage, generation);
    }

    const singleMonthMeasurements = Array.from({ length: 12 }, (_, monthIndex) => getSingleMonthData(monthIndex));
    return {
        totalUsageKWh: singleMonthMeasurements.map(m => m.totalUsageKWh),
        controlledGridUsageKWh: singleMonthMeasurements.map(m => m.controlledGridUsageKWh),
        phase1GridUsageKWh: singleMonthMeasurements.map(m => m.phase1GridUsageKWh),
        phase2GridUsageKWh: singleMonthMeasurements.map(m => m.phase2GridUsageKWh),
        phase3GridUsageKWh: singleMonthMeasurements.map(m => m.phase3GridUsageKWh),
        phase1SolarUsageKWh: singleMonthMeasurements.map(m => m.phase1SolarUsageKWh),
        phase2SolarUsageKWh: singleMonthMeasurements.map(m => m.phase2SolarUsageKWh),
        phase3SolarUsageKWh: singleMonthMeasurements.map(m => m.phase3SolarUsageKWh),
        phase1ExportedKWh: singleMonthMeasurements.map(m => m.phase1ExportedKWh),
        phase2ExportedKWh: singleMonthMeasurements.map(m => m.phase2ExportedKWh),
        phase3ExportedKWh: singleMonthMeasurements.map(m => m.phase3ExportedKWh),
        batteryUsageKWh: singleMonthMeasurements.map(m => m.batteryUsageKWh),
        generationKWh: singleMonthMeasurements.map(m => m.generationKWh),
        batteryStoredKWh: singleMonthMeasurements.map(m => m.batteryStoredKWh),
        batteryLevelKWh: singleMonthMeasurements.map(m => m.batteryLevelKWh)
    };
}

export function getCumulativeHourlyMeasurementsByMonth(data: SummableHourlyMeasurementsByMonth): SummableHourlyMeasurementsByMonth {
    return {
        totalUsageKWh: data.totalUsageKWh.map(accumulate),
        controlledGridUsageKWh: data.controlledGridUsageKWh.map(accumulate),
        phase1GridUsageKWh: data.phase1GridUsageKWh.map(accumulate),
        phase2GridUsageKWh: data.phase2GridUsageKWh.map(accumulate),
        phase3GridUsageKWh: data.phase3GridUsageKWh.map(accumulate),
        phase1SolarUsageKWh: data.phase1SolarUsageKWh.map(accumulate),
        phase2SolarUsageKWh: data.phase2SolarUsageKWh.map(accumulate),
        phase3SolarUsageKWh: data.phase3SolarUsageKWh.map(accumulate),
        phase1ExportedKWh: data.phase1ExportedKWh.map(accumulate),
        phase2ExportedKWh: data.phase2ExportedKWh.map(accumulate),
        phase3ExportedKWh: data.phase3ExportedKWh.map(accumulate),
        batteryUsageKWh: data.batteryUsageKWh.map(accumulate),
        generationKWh: data.generationKWh.map(accumulate),
        batteryStoredKWh: data.batteryStoredKWh.map(accumulate)
    };
}

export function getAnnualMeasurements(data: SummableHourlyMeasurementsByMonth): AnnualMeasurements {
    function getSumForMonth(hourlyMeasurements: number[], monthIndex: number): number {
        return monthDays[monthIndex] * getSum(hourlyMeasurements);
    }

    return {
        totalUsageKWh: getSum(data.totalUsageKWh.map(getSumForMonth)),
        controlledGridUsageKWh: getSum(data.controlledGridUsageKWh.map(getSumForMonth)),
        phase1GridUsageKWh: getSum(data.phase1GridUsageKWh.map(getSumForMonth)),
        phase2GridUsageKWh: getSum(data.phase2GridUsageKWh.map(getSumForMonth)),
        phase3GridUsageKWh: getSum(data.phase3GridUsageKWh.map(getSumForMonth)),
        phase1SolarUsageKWh: getSum(data.phase1SolarUsageKWh.map(getSumForMonth)),
        phase2SolarUsageKWh: getSum(data.phase2SolarUsageKWh.map(getSumForMonth)),
        phase3SolarUsageKWh: getSum(data.phase3SolarUsageKWh.map(getSumForMonth)),
        phase1ExportedKWh: getSum(data.phase1ExportedKWh.map(getSumForMonth)),
        phase2ExportedKWh: getSum(data.phase2ExportedKWh.map(getSumForMonth)),
        phase3ExportedKWh: getSum(data.phase3ExportedKWh.map(getSumForMonth)),
        batteryUsageKWh: getSum(data.batteryUsageKWh.map(getSumForMonth)),
        generationKWh: getSum(data.generationKWh.map(getSumForMonth)),
        batteryStoredKWh: getSum(data.batteryStoredKWh.map(getSumForMonth))
    }
}

function getHourlyMeasurementsForSingleMonth(
    solarConfiguration: SolarConfiguration,
    usage: HourlyUsageValue[],
    generationKWh: number[]
): HourlyMeasurementsForSingleMonth {
    const totalUsageKWh = Array<number>(24).fill(0);
    const controlledGridUsageKWh = Array<number>(24).fill(0);
    const phase1GridUsageKWh = Array<number>(24).fill(0);
    const phase2GridUsageKWh = Array<number>(24).fill(0);
    const phase3GridUsageKWh = Array<number>(24).fill(0);
    const phase1SolarUsageKWh = Array<number>(24).fill(0);
    const phase2SolarUsageKWh = Array<number>(24).fill(0);
    const phase3SolarUsageKWh = Array<number>(24).fill(0);
    const phase1ExportedKWh = Array<number>(24).fill(0);
    const phase2ExportedKWh = Array<number>(24).fill(0);
    const phase3ExportedKWh = Array<number>(24).fill(0);
    const batteryUsageKWh = Array<number>(24).fill(0);
    const batteryStoredKWh = Array<number>(24).fill(0);
    const batteryLevelKWh = Array<number>(24).fill(0);

    // Loop through twice, so that starting battery capacity accounts for the previous day.
    let batteryLevel = 0;
    for (let i = 0; i < 2; i++) {
        for (let hour = 0; hour < 24; hour++) {
            const used = usage[hour];
            const generated = generationKWh[hour];

            const phaseUsageDifferentials = getPhaseUsageDifferentials(solarConfiguration, used, generated);
            let deficits = phaseUsageDifferentials.filter(d => d.usageKWh > d.generatedKWh).map(d => ({
                phase: d.phaseNumber,
                deficit: d.usageKWh - d.generatedKWh
            }));

            let suppliedByBattery = 0;
            while (deficits.length > 0 && batteryLevel > 0) {
                const minRequirement = Math.min(...deficits.map(d => d.deficit));
                const perPhaseBatterySupply = Math.min(batteryLevel / deficits.length, minRequirement);
                const batteryUsage = perPhaseBatterySupply * deficits.length;
                suppliedByBattery += batteryUsage;
                batteryLevel -= batteryUsage;
                deficits = deficits.map(d => ({...d, deficit: d.deficit - perPhaseBatterySupply})).filter(d => d.deficit > 0);
            }

            let surpluses = phaseUsageDifferentials.filter(d => d.generatedKWh > d.usageKWh).map(d => ({
                phase: d.phaseNumber,
                surplus: d.generatedKWh - d.usageKWh
            }));

            let storedToBattery = 0;
            while (surpluses.length > 0 && batteryLevel < solarConfiguration.batteryCapacityKWh) {
                const minSurplus = Math.min(...surpluses.map(s => s.surplus));
                const remainingBatteryCapacity = solarConfiguration.batteryCapacityKWh - batteryLevel;
                const perPhaseBatteryTopup = Math.min(remainingBatteryCapacity / surpluses.length, minSurplus);
                const partialStorageToBattery = perPhaseBatteryTopup * surpluses.length;
                storedToBattery += partialStorageToBattery;
                batteryLevel += partialStorageToBattery;
                surpluses = surpluses.map(s => ({...s, surplus: s.surplus - perPhaseBatteryTopup})).filter(s => s.surplus > 0);
            }

            totalUsageKWh[hour] = used.cylinder + used.phase1 + used.phase2 + used.phase3;
            controlledGridUsageKWh[hour] = solarConfiguration.waterCylinderSource === WaterCylinderSource.Grid ? used.cylinder : 0;
            phase1GridUsageKWh[hour] = getSum(deficits.filter(d => d.phase === 1).map(d => d.deficit));
            phase2GridUsageKWh[hour] = getSum(deficits.filter(d => d.phase === 2).map(d => d.deficit));
            phase3GridUsageKWh[hour] = getSum(deficits.filter(d => d.phase === 3).map(d => d.deficit));
            phase1SolarUsageKWh[hour] = Math.min(phaseUsageDifferentials[0].generatedKWh, phaseUsageDifferentials[0].usageKWh);
            phase2SolarUsageKWh[hour] = Math.min(phaseUsageDifferentials[1].generatedKWh, phaseUsageDifferentials[1].usageKWh);
            phase3SolarUsageKWh[hour] = Math.min(phaseUsageDifferentials[2].generatedKWh, phaseUsageDifferentials[2].usageKWh);
            phase1ExportedKWh[hour] = getSum(surpluses.filter(d => d.phase === 1).map(d => d.surplus));
            phase2ExportedKWh[hour] = getSum(surpluses.filter(d => d.phase === 2).map(d => d.surplus));
            phase3ExportedKWh[hour] = getSum(surpluses.filter(d => d.phase === 3).map(d => d.surplus));
            batteryUsageKWh[hour] = suppliedByBattery;
            batteryStoredKWh[hour] = storedToBattery;
            batteryLevelKWh[hour] = batteryLevel;

            // Check
            const usageComponents = [
                controlledGridUsageKWh[hour],
                phase1GridUsageKWh[hour], phase2GridUsageKWh[hour], phase3GridUsageKWh[hour],
                phase1SolarUsageKWh[hour], phase2SolarUsageKWh[hour], phase3SolarUsageKWh[hour],
                batteryUsageKWh[hour]
            ];

            if (getSum(usageComponents).toPrecision(8) !== totalUsageKWh[hour].toPrecision(8)) {
                throw new Error(`Wrong usage: Total: ${totalUsageKWh[hour]}, Sum: ${getSum(usageComponents)}`);
            }

            const generationComponents = [
                phase1SolarUsageKWh[hour], phase2SolarUsageKWh[hour], phase3SolarUsageKWh[hour],
                phase1ExportedKWh[hour], phase2ExportedKWh[hour], phase3ExportedKWh[hour],
                batteryStoredKWh[hour]
            ];

            if (getSum(generationComponents).toPrecision(8) !== generationKWh[hour].toPrecision(8)) {
                throw new Error(`Wrong generation: Total: ${generationKWh[hour]}, Sum: ${getSum(generationComponents)}`);
            }
        }
    }

    return {
        totalUsageKWh ,
        controlledGridUsageKWh,
        phase1GridUsageKWh,
        phase2GridUsageKWh,
        phase3GridUsageKWh,
        phase1SolarUsageKWh,
        phase2SolarUsageKWh,
        phase3SolarUsageKWh,
        phase1ExportedKWh,
        phase2ExportedKWh,
        phase3ExportedKWh,
        batteryUsageKWh,
        generationKWh,
        batteryStoredKWh,
        batteryLevelKWh
    };
}

function getPhaseUsageDifferentials(solarConfiguration: SolarConfiguration, used: HourlyUsageValue, generatedKWh: number): PhaseUsageDifferential[] {
    const phaseUsages = [
        {phaseNumber: 1, usage: solarConfiguration.waterCylinderSource === WaterCylinderSource.Phase1 ? used.phase1 + used.cylinder : used.phase1},
        {phaseNumber: 2, usage: solarConfiguration.waterCylinderSource === WaterCylinderSource.Phase2 ? used.phase2 + used.cylinder : used.phase2},
        {phaseNumber: 3, usage: solarConfiguration.waterCylinderSource === WaterCylinderSource.Phase3 ? used.phase3 + used.cylinder : used.phase3}
    ];

    switch (solarConfiguration.phaseConfiguration) {
        case PhaseConfigurationOption.SinglePhase1Inverter:
            return [generatedKWh, 0, 0].map((s, i) => ({phaseNumber: 1, generatedKWh: s, usageKWh: phaseUsages[i].usage}));
        case PhaseConfigurationOption.SinglePhase2Inverter:
            return [0, generatedKWh, 0].map((s, i) => ({phaseNumber: 2, generatedKWh: s, usageKWh: phaseUsages[i].usage}));
        case PhaseConfigurationOption.SinglePhase3Inverter:
            return [0, 0, generatedKWh].map((s, i) => ({phaseNumber: 3, generatedKWh: s, usageKWh: phaseUsages[i].usage}));
        case PhaseConfigurationOption.ThreePhaseInverterEqualDistribution:
            return phaseUsages.map(u => ({phaseNumber: u.phaseNumber, generatedKWh: generatedKWh / 3, usageKWh: u.usage}));
        case PhaseConfigurationOption.ThreePhaseInverterBalanced:
            return getBalancedPhaseUsageDifferentials();
        default:
            throw new Error(`Unexpected phase configuration option: ${solarConfiguration.phaseConfiguration}`);
    }

    function getBalancedPhaseUsageDifferentials(): PhaseUsageDifferential[] {
        let generatedRemainingKWh = generatedKWh;
        const sortedPhases = [...phaseUsages].sort((a, b) => (a.usage > b.usage ? -1 : 1));
        const preSurplusDifferentials = [];
        for (const phaseUsage of sortedPhases) {
            const generatedForPhaseKWh = Math.min(phaseUsage.usage, generatedRemainingKWh);
            preSurplusDifferentials.push({phaseNumber: phaseUsage.phaseNumber, generatedKWh: generatedForPhaseKWh, usageKWh: phaseUsage.usage});
            generatedRemainingKWh -= generatedForPhaseKWh;
        }

        const differentials = preSurplusDifferentials.map(i => ({...i, generatedKWh: i.generatedKWh + generatedRemainingKWh / 3}));
        return differentials.sort((a, b) => (a.phaseNumber < b.phaseNumber ? -1 : 1));
    }
}

function accumulate(values: number[]): number[] {
    let sum = 0;
    const result = [];
    for (const value of values) {
        sum += value;
        result.push(sum);
    }

    return result;
}

function getGenerationInKWh(wPerSqm: number, maxEfficiency: number, panelArea: number) {
    const lowLightAdjustment =
        wPerSqm < 1 ? 0 :
        wPerSqm < 25 ? 0.3 :
        wPerSqm < 50 ? 0.6 :
        wPerSqm < 100 ? 0.87 :
        wPerSqm < 200 ? 0.94 :
        wPerSqm < 400 ? 0.98 :
        1;

    return wPerSqm * maxEfficiency * lowLightAdjustment * panelArea / 1000;
}

function getPanelEfficiency(solarConfiguration: SolarConfiguration) {
    // The panel rating is the number of Watts generated at 1000 W/sqm irradiance.
    const wattsSuppliedPerSqm = 1000;
    const wattsGeneratedPerSqm = solarConfiguration.panelRatingW / solarConfiguration.singlePanelAreaSqm;
    
    // The efficiency is Watts generated per Watt supplied (over the same area).
    return wattsGeneratedPerSqm / wattsSuppliedPerSqm;
}

type PhaseUsageDifferential = {
    phaseNumber: number,
    generatedKWh: number,
    usageKWh: number
};
