import * as d3 from 'd3'
import moment from 'moment';
import { HourlyIrradianceByMonth, HourlyUsageByMonth, NiwaSourceColumns, PowershopUsageColumns } from './types';
// https://vitejs.dev/guide/assets.html#explicit-url-imports
import niwaNorthWestCsv from './assets/table_mhr_northwest.csv?url';
import niwaNorthEastCsv from './assets/table_mhr_northeast.csv?url';
import usageCsv from './assets/powershop_daily_usage.csv?url';
import { getAverage } from './stats';

export async function getHourlyIrradianceByMonth(): Promise<HourlyIrradianceByMonth> {
    const niwaNorthWestData = await d3.csv<NiwaSourceColumns>(niwaNorthWestCsv);
    const niwaNorthEastData = await d3.csv<NiwaSourceColumns>(niwaNorthEastCsv);

    return {
        northWest: toHourlyIrradianceByMonth(niwaNorthWestData),
        northEast: toHourlyIrradianceByMonth(niwaNorthEastData)
    };
}

export async function getHourlyUsageByMonth(): Promise<HourlyUsageByMonth> {
    const usageData = await d3.csv<PowershopUsageColumns>(usageCsv);
    const hourlyUsageByMonth = toHourlyUsageByMonth(usageData);
    return {
        main: hourlyUsageByMonth
    };
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

function toHourlyUsageByMonth(usageData: d3.DSVRowArray<PowershopUsageColumns>): number[][] {
    // Convert from half-hourly to hourly
    const hourlyUsages = usageData.map(d => ({
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

    return Array.from({length: 12}, (_, monthIndex) => {
        const allDaysHourlyUsage = hourlyUsages.filter(u => u.month === monthIndex);
        return Array.from({length: 24}, (_, hour) => {
            const hourUsages = allDaysHourlyUsage.map(u => u.hourlyUsage[hour]);
            // TODO: Improve this adjustment
            return getAverage(hourUsages) * 1.8;
        });
    });
}
