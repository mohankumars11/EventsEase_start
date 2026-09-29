            ? `${qty} × ${formatINR(selectedPack.price)} per ${selectedPack.unitLabel ?? 'unit'}`
            : 'One price for the event',
        summary: [
          `${selectedPack.name}${selectedPack.unit === 'unit' ? ` × ${qty}` : ''}`,
          ...selectedPack.includes,
        ],
      }
    }

    if (resolved.kind === 'menu' && menuConfig?.total > 0) {
      return {
        optionId: menuConfig.cuisine.id,
        optionName: `${menuConfig.cuisine.name}${menuConfig.vegOnly ? ' (pure veg)' : ''}`,
        price: menuConfig.total,
        label: `${menuConfig.cuisine.name} — ${guestCount} plates`,
        detail: `${formatINR(menuConfig.perPlate)} per plate × ${guestCount} guests`,
        summary: menuConfig.summary,
      }
    }

    if (resolved.kind === 'logistics' && logisticsDemandIsComplete(resolved.service.id, logisticsDemand)) {
      const signature = Object.entries(logisticsDemand)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => k + '=' + (Array.isArray(v) ? v.slice().sort().join(',') : v))
        .join('|')
      return {
        optionId: 'request-' + encodeURIComponent(signature).slice(0, 120),
        optionName: resolved.service.name,
        price: null,
        label: resolved.service.name,
        detail: 'Structured quote after requirements review',
        summary: logisticsDemandSummary(resolved.service.id, logisticsDemand),
        logisticsDemand,
      }
    }

    return null
  }, [resolved, selectedTheme, selectedPack, packQty, menuConfig, logisticsDemand, scaleId, guestCount])

  const alreadyAdded = !!(selection && eventId && hasItem(eventId, `${resolved.service.id}:${selection.optionId}`))

  /**
   * Adding to the cart. One step, no gate, no form.
   *
   * ── What was here, and why it was broken ────────────────────────────
   * Pressing "Add to cart" used to open a four-field modal (date, time, guest
   * count, location) and then, on confirm, throw a signed-out visitor to
   * /login. Both halves failed:
   *
   *   · the modal re-asked the guest count that had just driven every price on
   *     the screen, and the city shown in the app bar two inches above it;