module.exports = {
  /**
   * Reloads all nginx containers
   * @param {Object} docker - Docker instance
   */
  reload: async (docker) => {
    const nginxContainers = await docker.listContainers({"filters": "{\"ancestor\": [\"nginx\"]}" });
    nginxContainers.map(async container => {
      const c = await docker.getContainer(container.Id);
      await c.kill({signal: 'HUP'});
    })
  }
}
