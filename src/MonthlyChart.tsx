import { useEffect, useState } from "react"
import * as d3 from 'd3'
import { ViewDimensions } from "./types"
import moment from "moment";

const monthIndexes = Array.from({ length: 12 }, (_, i) => i);
const monthNames = monthIndexes.map(i => moment(new Date(2001, i, 1)).format("MMM"));

export interface MonthlyChartProps {
    monthlyValuesRetriever: (monthIndex: number) => number[]
    viewDimensions: ViewDimensions
    propertyDisplayName: string
    yAxisDescription: string
}

export function MonthlyChart(props: MonthlyChartProps) {
    const [id] = useState(`monthly-chart-${Math.random().toString(36).substring(2, 10)}`);
    const containerSelector = `#${id}`;

    useEffect(() => {
        const tooltipElem = createTooltipElem(containerSelector);
        drawHourlyLineGraphByMonth(
            props.viewDimensions,
            tooltipElem,
            containerSelector,
            props.monthlyValuesRetriever,
            props.propertyDisplayName,
            props.yAxisDescription);

        return () => clearChart(containerSelector);
    });

    return <div id={id} />
}

function createTooltipElem(containerSelector: string): d3.Selection<any, any, any, any> {
    return d3.select(containerSelector).append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
}

function clearChart(containerSelector: string) {
    d3.select(containerSelector).selectAll('*').remove();
}

function drawHourlyLineGraphByMonth(
    viewDimensions: ViewDimensions,
    tooltipElem: d3.Selection<any, any, any, any>,
    containerSelector: string,
    monthlyValuesRetriever: (monthIndex: number) => number[],
    propertyDisplayName: string,
    yAxisDescription: string
) {
    const timeOffset = monthlyValuesRetriever(0).length == 24 ? 0.5 : 0;
    const group = d3.select(containerSelector)
        .append("svg")
        .attr("width", viewDimensions.svgWidth)
        .attr("height", viewDimensions.svgHeight)
        .append("g")
        .attr("transform", "translate(" + viewDimensions.margin.left + "," + viewDimensions.margin.top + ")");

    const monthlyValues = monthIndexes.map(i => monthlyValuesRetriever(i));
    const maximums = monthlyValues.map(vals => Math.max(...vals));

    const dataWidth = viewDimensions.svgWidth - viewDimensions.margin.left - viewDimensions.margin.right;
    let scaleX = d3.scaleLinear()
        .rangeRound([0, dataWidth])
        .domain([0, 24]);

    const dataHeight = viewDimensions.svgHeight - viewDimensions.margin.top - viewDimensions.margin.bottom;
    let scaleY = d3.scaleLinear()
        .rangeRound([dataHeight, 0])
        .domain([0, Math.max(...maximums)]);

    let line = d3.line<LineDatum>()
        .x(d => scaleX(d.time + timeOffset))
        .y(d => scaleY(d.value))
        .curve(d3.curveMonotoneX);
        group.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + dataHeight + ")")
        .call(d3.axisBottom(scaleX));

    group.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(scaleY))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .style("text-anchor", "end")
        .text(yAxisDescription);

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthName = monthNames[monthIndex];
        const monthData = monthlyValues[monthIndex];
        const dataPoints = monthData.map((value, index) => ({
            time: index,
            value: value
        }));

        group.append("path")
            .datum(dataPoints)
            .attr("class", "line")
            .attr("d", line)
            .style("stroke", d3.interpolateRainbow(monthIndex / 12));

        group.selectAll(".dot-" + monthIndex)    
            .data(dataPoints)
            .enter()
            .append("circle")
            .attr("class", ".dot-" + monthIndex)
            .attr("fill", d3.interpolateRainbow(monthIndex / 12))
            .attr("r", 5)
            .attr("cx", d => scaleX(d.time + timeOffset))
            .attr("cy", d => scaleY(d.value))
            .on("mouseover", (e, d) => {
                tooltipElem.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipElem.html(`
                        Month: ${monthName}<br/>
                        Time: ${d.time % 24}:00<br/>
                        ${propertyDisplayName}: ${d.value.toFixed(2)}
                    `)
                    .style("left", (e.pageX) + "px")
                    .style("top", (e.pageY - 28) + "px");
                })
            .on("mouseout", () => {
                tooltipElem.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
}

type LineDatum = {
    time: number,
    value: number
};