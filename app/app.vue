<template>
  <MotionConfig reduced-motion="user">
    <div>
      <header class="top-bar">
        <NuxtLink
          to="/"
          class="brand"
        >GRIFFDIVE</NuxtLink>
        <nav>
          <NuxtLink to="/codex">Codex</NuxtLink>
        </nav>
      </header>
      <NuxtPage />
    </div>
  </MotionConfig>
</template>
