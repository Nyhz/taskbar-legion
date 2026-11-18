# Backlog del rediseño

Cosas apuntadas por el usuario o durante el trabajo, sin fecha. **No se empieza ninguna sin que el usuario lo pida.**
Lo que está en marcha o acordado vive en `PROGRESS.md`; aquí solo lo aparcado. Cuando algo se empiece, se mueve a
`PROGRESS.md` y se borra de aquí.

- **Sombras en el camino para héroes y enemigos** (hoy solo las llevan las mascotas) — apuntado por el usuario el
  15 nov: «dejamos así, apunta en el backlog».
- Frases de tooltip redactadas a mano para los 36 efectos que hoy usan la frase genérica por tipo.
- Fichas de efecto sobre enemigos y jefes (sus frases ya están escritas; hoy solo los héroes llevan fichas).
- Repaso de nombres EN/ES (todos provisionales), sonido, calidad final de los iconos de habilidades y talentos,
  fondos de las dificultades intermedias.
- **Enemigos cuerpo a cuerpo que golpean desde lejos** (usuario, 18 nov): al golpear al héroe se ven desplazados hacia
  atrás y siguen pegando desde esa distancia; «es raro y parece poco orgánico». Revisar el empuje y retroceso visual
  (`shoveDelay`, `crowdLayout`, `lungeAttack`) frente a la distancia de golpe del sim, para que el que golpea esté
  pegado a su objetivo.
- **Élites sin rayos morados** (usuario, 18 nov): quitarles los rayos morados verticales y dejarles solo el aura
  (`render/eliteLook.ts`).
- **Llegada de los enemigos poco fluida** (usuario, 18 nov): al acercarse a veces se paran y dan un deslizamiento
  hacia atrás; «no va smooth». Revisar el avance y el reparto en la pila (`easeCrowd`, `trackDisplay`, la posición
  mostrada frente a la del sim) para que la llegada sea continua.
