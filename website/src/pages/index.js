import React, { useState, useEffect } from "react";
import { Box, Stack, ImageList, ImageListItem, ImageListItemBar, Typography } from "@mui/material";

export default function Home() {

  const [pictures, setPictures] = useState();

  useEffect(() => {
    const getPics = async () => {
      const response = await fetch(`https://gallery.dumbartgallery.com/recent`)
      const respJson = await response.json()
      console.log(respJson)
      setPictures(respJson.paintings)
    }
    getPics()
  }, []);

  return (
    <Box display="flex"
      justifyContent="center"
      alignItems="center">
      <Stack spacing={4} width={1024} >
        {
          pictures ?
            <ImageList cols={1} gap={8}>
              {pictures.map((p, idx) => (
                <ImageListItem key={idx}>
                  <img
                    srcSet={p.url}
                    src={p.url}
                    alt={p.prompt}
                    loading="lazy"
                  />
                  <ImageListItemBar
                    title={p.prompt}
                    subtitle={<span>by: {p.author}</span>}
                    position="below"
                  />
                </ImageListItem>
              ))}
            </ImageList>
            :
            <Typography variant="body1">...</Typography>
        }
      </Stack>
    </Box>
  )
}
