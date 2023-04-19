import * as d3 from 'd3'
import moment from 'moment';
import { EcotricityUsageColumns, HourlyIrradianceByMonth, HourlyUsageByMonth, HourlyUsageValue, NiwaSourceColumns, PowershopUsageColumns } from './types';
// https://vitejs.dev/guide/assets.html#explicit-url-imports
import niwaNorthWestCsv from './assets/table_mhr_northwest.csv?url';
import niwaNorthEastCsv from './assets/table_mhr_northeast.csv?url';
import powershopUsageCsv from './assets/powershop_daily_usage.csv?url';
import ecotricityUsageCsv from './assets/ecotricity_usage.csv?url';
import { getAverage, getSum } from './stats';

// TODO: Get data or make editable
const hourlyPhaseUsageDistribution = new Map<number, [number, number]>([
    [ 0, [0.125, 0.75]],
    [ 1, [0.125, 0.75]],
    [ 2, [0.125, 0.75]],
    [ 3, [0.125, 0.75]],
    [ 4, [0.125, 0.75]],
    [ 5, [0.125, 0.75]],
    [ 6, [0.125, 0.75]],
    [ 7, [0.2,   0.5 ]],
    [ 8, [0.4,   0.25]],
    [ 9, [0.25,  0.45]],
    [10, [0.25,  0.45]],
    [11, [0.25,  0.45]],
    [12, [0.25,  0.45]],
    [13, [0.25,  0.45]],
    [14, [0.25,  0.45]],
    [15, [0.25,  0.45]],
    [16, [0.25,  0.45]],
    [17, [0.25,  0.45]],
    [18, [0.25,  0.45]],
    [19, [0.2,   0.5 ]],
    [20, [0.125, 0.75]],
    [21, [0.125, 0.75]],
    [22, [0.125, 0.75]],
    [23, [0.125, 0.75]],
]);

function getPhaseUsageDistribution(hour: number): [number, number, number] {
    const [phase1Proportion, phase2Proportion] = hourlyPhaseUsageDistribution.get(hour)!;
    return [phase1Proportion, phase2Proportion, 1 - (phase1Proportion + phase2Proportion)];
}

export async function getHourlyIrradianceByMonth(): Promise<HourlyIrradianceByMonth> {
    const niwaNorthWestData = await d3.csv<NiwaSourceColumns>(niwaNorthWestCsv);
    const niwaNorthEastData = await d3.csv<NiwaSourceColumns>(niwaNorthEastCsv);

    return {
        northWest: toHourlyIrradianceByMonth(niwaNorthWestData),
        northEast: toHourlyIrradianceByMonth(niwaNorthEastData)
    };
}

export async function getHourlyUsageByMonth(): Promise<HourlyUsageByMonth> {
    const powershopUsageData = await d3.csv<PowershopUsageColumns>(powershopUsageCsv);
    const ecotricityUsageData = await d3.csv<EcotricityUsageColumns>(ecotricityUsageCsv);
    return toHourlyUsageByMonth(powershopUsageData, ecotricityUsageData);
}

function toHourlyIrradianceByMonth(niwaData: d3.DSVRowArray<NiwaSourceColumns>): number[][] {
    const result = Array.from({length: 12}, _ => Array<number>(24));
    for (const d of niwaData) {
        const [monthStr, timeStr] = d['Month & hour']!.split(' ').map(s => s.trim()).filter(s => s);
        const monthIndex = moment(monthStr, "MMM").month();
        const [hourStr, _] = timeStr.split(":");
        const hour = parseInt(hourStr);
        result[monthIndex][hour] = parseFloat(d['Hourly W/m2']!);
    }

    return result;
}

function toHourlyUsageByMonth(
    powershopUsageData: d3.DSVRowArray<PowershopUsageColumns>,
    ecotricityUsageData: d3.DSVRowArray<EcotricityUsageColumns>
): HourlyUsageByMonth {
    // Group Ecotricity data by month
    const allEcotricityHourlyUsageByMonth = ecotricityUsageData.reduce((monthlyData: HourlyUsageValue[][][], row) => {
        const time = moment(row['Time stamp'], "YYYY-MM-DD hh:mm");
        const monthData = monthlyData[time.month()];
        let dayDataByHour: HourlyUsageValue[]
        if (monthData.length === 0 || time.hour() === 0 && time.minute() === 0) {
            dayDataByHour = Array.from({length: 24}, () => ({phase1: 0, phase2: 0, phase3: 0, cylinder: 0}));
            monthData.push(dayDataByHour);
        } else {
            dayDataByHour = monthData[monthData.length - 1];
        }

        const [phase1Proportion, phase2Proportion, phase3Proportion] = getPhaseUsageDistribution(time.hour());
        const totalUncontrolled = parseFloat(row['Meter 1 Value (kWh)'] || "0");
        dayDataByHour[time.hour()].phase1 += totalUncontrolled * phase1Proportion;
        dayDataByHour[time.hour()].phase2 += totalUncontrolled * phase2Proportion;
        dayDataByHour[time.hour()].phase3 += totalUncontrolled * phase3Proportion;
        dayDataByHour[time.hour()].cylinder += parseFloat(row['Meter 2 Value (kWh)'] || "0");
        return monthlyData;
    }, Array.from({length: 12}, () => []));

    const avgEcotricityHourlyUsageByMonth = allEcotricityHourlyUsageByMonth.map(monthData => {
        // Some months won't have data. Avoid divide-by-zero exceptions trying to work
        // out the averages for these months.
        if (monthData.length === 0) {
            return [];
        }

        return Array.from({length: 24}, (_, hour) => ({
            phase1: getAverage(monthData.map(dayData => dayData[hour].phase1)),
            phase2: getAverage(monthData.map(dayData => dayData[hour].phase2)),
            phase3: getAverage(monthData.map(dayData => dayData[hour].phase3)),
            cylinder: getAverage(monthData.map(dayData => dayData[hour].cylinder))
        }));
    });

    const allEcotricityHourlyUsage = allEcotricityHourlyUsageByMonth.flatMap(monthUsage => monthUsage);

    // Get controlled as a proportion of total by time of day
    const hourlyProportionOfCylinderToTotal = Array.from({length: 24}, (_, hour) => {
        const totalCylinder = getSum(allEcotricityHourlyUsage.map(u => u[hour].cylinder));
        const total = getSum(allEcotricityHourlyUsage.map(u => u[hour].phase1 + u[hour].phase2 + u[hour].phase3 + u[hour].cylinder));
        return totalCylinder / total;
    });

    // Convert Powershop data from half-hourly to hourly
    const powershopHourlyUsages = powershopUsageData.map(d => ({
        month: moment(d.Date, "D/M/YYYY").month(),
        hourlyUsage: [
            parseFloat(d["00:00 - 00:30"]!) + parseFloat(d["00:30 - 01:00"]!) || 0,
            parseFloat(d["01:00 - 01:30"]!) + parseFloat(d["01:30 - 02:00"]!) || 0,
            parseFloat(d["02:00 - 02:30"]!) + parseFloat(d["02:30 - 03:00"]!) || 0,
            parseFloat(d["03:00 - 03:30"]!) + parseFloat(d["03:30 - 04:00"]!) || 0,
            parseFloat(d["04:00 - 04:30"]!) + parseFloat(d["04:30 - 05:00"]!) || 0,
            parseFloat(d["05:00 - 05:30"]!) + parseFloat(d["05:30 - 06:00"]!) || 0,
            parseFloat(d["06:00 - 06:30"]!) + parseFloat(d["06:30 - 07:00"]!) || 0,
            parseFloat(d["07:00 - 07:30"]!) + parseFloat(d["07:30 - 08:00"]!) || 0,
            parseFloat(d["08:00 - 08:30"]!) + parseFloat(d["08:30 - 09:00"]!) || 0,
            parseFloat(d["09:00 - 09:30"]!) + parseFloat(d["09:30 - 10:00"]!) || 0,
            parseFloat(d["10:00 - 10:30"]!) + parseFloat(d["10:30 - 11:00"]!) || 0,
            parseFloat(d["11:00 - 11:30"]!) + parseFloat(d["11:30 - 12:00"]!) || 0,
            parseFloat(d["12:00 - 12:30"]!) + parseFloat(d["12:30 - 13:00"]!) || 0,
            parseFloat(d["13:00 - 13:30"]!) + parseFloat(d["13:30 - 14:00"]!) || 0,
            parseFloat(d["14:00 - 14:30"]!) + parseFloat(d["14:30 - 15:00"]!) || 0,
            parseFloat(d["15:00 - 15:30"]!) + parseFloat(d["15:30 - 16:00"]!) || 0,
            parseFloat(d["16:00 - 16:30"]!) + parseFloat(d["16:30 - 17:00"]!) || 0,
            parseFloat(d["17:00 - 17:30"]!) + parseFloat(d["17:30 - 18:00"]!) || 0,
            parseFloat(d["18:00 - 18:30"]!) + parseFloat(d["18:30 - 19:00"]!) || 0,
            parseFloat(d["19:00 - 19:30"]!) + parseFloat(d["19:30 - 20:00"]!) || 0,
            parseFloat(d["20:00 - 20:30"]!) + parseFloat(d["20:30 - 21:00"]!) || 0,
            parseFloat(d["21:00 - 21:30"]!) + parseFloat(d["21:30 - 22:00"]!) || 0,
            parseFloat(d["22:00 - 22:30"]!) + parseFloat(d["22:30 - 23:00"]!) || 0,
            parseFloat(d["23:00 - 23:30"]!) + parseFloat(d["23:30 - 00:00"]!) || 0
        ]
    }));

    const avgPowershopHourlyUsageByMonth = Array.from({length: 12}, (_, monthIndex) => {
        const allDaysHourlyUsage = powershopHourlyUsages.filter(u => u.month === monthIndex);
        return Array.from({length: 24}, (_, hour) => {
            const avgUseForHour = getAverage(allDaysHourlyUsage.map(u => u.hourlyUsage[hour]));
            // We don't have the relationship between controlled and uncontrolled here,
            // so use what we've found for this hour from Ecotricity.
            const cylinder = hourlyProportionOfCylinderToTotal[hour] * avgUseForHour;
            const uncontrolled = avgUseForHour - cylinder;
            const [phase1Proportion, phase2Proportion, phase3Proportion] = getPhaseUsageDistribution(hour);
            return {
                phase1: uncontrolled * phase1Proportion,
                phase2: uncontrolled * phase2Proportion,
                phase3: uncontrolled * phase3Proportion,
                cylinder
            };
        });
    });

    // For the data that we do have, get the relative increase between Powershop and Ecotricity
    // by time of day.
    const avgUsageIncreaseByHour = Array.from({length: 24}, (_, hour) => {
        // Start with Ecotricity, since we don't have that for every month.
        const allHourlyUsages = avgEcotricityHourlyUsageByMonth.filter(u => u.length > 0).map((avgEcotricityHourlyUsage, monthIndex) => {
            const avgPowershopHourlyUsage = avgPowershopHourlyUsageByMonth[monthIndex];
            return {
                powershop: avgPowershopHourlyUsage[hour],
                ecotricity: avgEcotricityHourlyUsage[hour]
            };
        });

        const powershopPhase1Total = getSum(allHourlyUsages.map(u => u.powershop.phase1));
        const powershopPhase2Total = getSum(allHourlyUsages.map(u => u.powershop.phase2));
        const powershopPhase3Total = getSum(allHourlyUsages.map(u => u.powershop.phase3));
        const powershopCylinderTotal = getSum(allHourlyUsages.map(u => u.powershop.cylinder));

        const ecotricityPhase1Total = getSum(allHourlyUsages.map(u => u.ecotricity.phase1));
        const ecotricityPhase2Total = getSum(allHourlyUsages.map(u => u.ecotricity.phase2));
        const ecotricityPhase3Total = getSum(allHourlyUsages.map(u => u.ecotricity.phase3));
        const ecotricityCylinderTotal = getSum(allHourlyUsages.map(u => u.ecotricity.cylinder));

        return {
            phase1Multiplier: ecotricityPhase1Total / powershopPhase1Total,
            phase2Multiplier: ecotricityPhase2Total / powershopPhase2Total,
            phase3Multiplier: ecotricityPhase3Total / powershopPhase3Total,
            cylinderMultiplier: ecotricityCylinderTotal / powershopCylinderTotal
        };
    });

    return Array.from({length: 12}, (_, monthIndex) => {
        const avgEcotricityHourlyUsage = avgEcotricityHourlyUsageByMonth[monthIndex];
        if (avgEcotricityHourlyUsage.length > 0) {
            return avgEcotricityHourlyUsage;
        }

        // No Ecotricity data, so calculate based on Powershop data and average increases.
        const powershopMonthHourlyUsage = avgPowershopHourlyUsageByMonth[monthIndex];
        return Array.from({length: 24}, (_, hour) => {
            const powershopUsage = powershopMonthHourlyUsage[hour];
            const increases = avgUsageIncreaseByHour[hour];
            return {
                phase1: powershopUsage.phase1 * increases.phase1Multiplier,
                phase2: powershopUsage.phase2 * increases.phase2Multiplier,
                phase3: powershopUsage.phase3 * increases.phase3Multiplier,
                cylinder: powershopUsage.cylinder * increases.cylinderMultiplier
            };
        });
    });
}
