"use client";

import useSWR from "swr";
import { ChartComponent, ChartComponentRef } from "./ChartComponent";
import { fetcher } from "../utils";
import { Asset, AssetDaily } from "../models";
import useSWRSubscription from "swr/subscription";
import { MutableRefObject, useRef } from "react";

export function AssetChartComponent(props: { asset_id: string }) {
  const chartRef = useRef() as MutableRefObject<ChartComponentRef>;

  const { data: asset, mutate } = useSWR(
    `http://localhost:3000/assets/${props.asset_id}`,
    fetcher,
    {
      fallbackData: { id: props.asset_id, price: 0 },
    }
  );

  const { data: assetDaily } = useSWRSubscription(
    `http://localhost:3000/assets/${props.asset_id}/daily/events`,
    (path, { next }) => {
      const eventSource = new EventSource(path);
      eventSource.addEventListener("asset-daily-created", async (event) => {
        const assetDailyCreated: AssetDaily = JSON.parse(event.data);
        chartRef.current.update({
          time: new Date(assetDailyCreated.date).toString(),
          value: assetDailyCreated.price,
        });
        await mutate(
          { id: assetDailyCreated.id, price: assetDailyCreated.price },
          false
        );
        next(null, assetDailyCreated);
      });

      eventSource.onerror = (event) => {
        console.error(event);
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    },
    {}
  );

  return (
    <ChartComponent
      header={`${props.asset_id} - R$ ${asset.price}`}
      ref={chartRef}
    />
  );
}
