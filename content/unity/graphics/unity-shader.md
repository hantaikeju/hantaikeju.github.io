---
title: "Unity Shader 入门"
date: 2026-06-10T21:06:00+08:00
draft: false
tags: ["Unity", "Shader", "图形学"]
categories: ["Unity开发"]
---

## 什么是 Shader？

Shader 是运行在 GPU 上的小程序，用于控制渲染管线的各个阶段。

## 基本 Shader 结构

```hlsl
Shader "Custom/SimpleShader"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
    }
    
    SubShader
    {
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };
            
            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };
            
            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }
            
            fixed4 frag (v2f i) : SV_Target
            {
                return tex2D(_MainTex, i.uv);
            }
            ENDCG
        }
    }
}
```
