import React, { useState, useEffect } from "react";
import { CssBaseline, Box, Stack, ImageList, ImageListItem, ImageListItemBar, Typography, useTheme, useMediaQuery } from "@mui/material";

export default function Home() {

  const [pictures, setPictures] = useState();

  const theme = useTheme()
  const downLg = useMediaQuery(theme.breakpoints.down('lg'));

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
    <>
      <CssBaseline />
      <Stack container
        spacing={4}
        direction="column"
        alignItems="center"
        sx={{ minHeight: '100vh' }}>
        <Typography variant="h2" sx={{ p: 4 }}>Dumb Art Gallery</Typography>
        {
          pictures ?
            // <ImageList spacing={0} cols={1} gap={8}>
            //   {pictures.map((p, idx) => (
            //     <ImageListItem key={idx} sx={{ w: "512px" }}>
            //       <img
            //         srcSet={p.url}
            //         src={p.url}
            //         alt={p.prompt}
            //         loading="lazy"
            //       />
            //       <ImageListItemBar
            //         title={p.prompt}
            //         subtitle={<span>by: {p.author}</span>}
            //         position="below"
            //       />
            //     </ImageListItem>
            //   ))}
            // </ImageList>
            pictures.map((p, idx) => (
              <Box sx={{ width: downLg ? "80%" : "1024px", paddingBottom: 4 }}>
                <img
                  width="100%"
                  height="auto"
                  key={idx}
                  srcSet={p.url}
                  src={p.url}
                  alt={p.prompt}
                  loading="lazy"
                />
                <Typography variant="body1">{p.prompt}</Typography>
                <Typography variant="body2">by {p.author}</Typography>
              </Box>
            ))
            :
            <Typography variant="body1">Loading...</Typography>
        }
      </Stack>
    </>

  )
}
